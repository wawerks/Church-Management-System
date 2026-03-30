"use server";

import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/action-log";
import type { Role } from "@/generated/prisma/enums";
import { redirect } from "next/navigation";

export async function approveVoidRequestAction(
  requestId: string,
  _formData: FormData,
) {
  void _formData; // server action payload is not needed for approvals
  const session = await requireRole(["ADMIN"] satisfies Role[]);

  const req = await prisma.voidRequest.findUnique({
    where: { id: requestId },
  });
  if (!req || req.status !== "PENDING") {
    throw new Error("Void request not found or already handled.");
  }

  const logParams = await prisma.$transaction(async (tx) => {
    let computed: {
      entity: string;
      entityId: string;
      details: Record<string, unknown>;
    } | null = null;

    if (req.entity === "DONATION") {
      const row = await tx.donation.findUnique({
        where: { id: req.entityId },
        select: {
          id: true,
          isDeleted: true,
          memberId: true,
          amount: true,
          type: true,
          date: true,
        },
      });
      if (!row || row.isDeleted) {
        throw new Error("Donation is no longer active.");
      }
      await tx.donation.update({
        where: { id: req.entityId },
        data: {
          isDeleted: true,
          voidReason: req.reason,
          voidedAt: new Date(),
          voidedBy: req.requestedById,
        },
      });
      computed = {
        entity: "Donation",
        entityId: row.id,
        details: {
          memberId: row.memberId,
          amount: Number(row.amount),
          type: row.type,
          date: row.date.toISOString(),
          voidReason: req.reason,
          requestedBy: req.requestedById,
          approvedBy: session.userId,
          voidRequestId: req.id,
        },
      };
    } else if (req.entity === "SERVICE_INCOME") {
      const row = await tx.serviceIncome.findUnique({
        where: { id: req.entityId },
        select: { id: true, isDeleted: true, serviceDate: true, amount: true },
      });
      if (!row || row.isDeleted) {
        throw new Error("Service income is no longer active.");
      }
      await tx.serviceIncome.update({
        where: { id: req.entityId },
        data: {
          isDeleted: true,
          voidReason: req.reason,
          voidedAt: new Date(),
          voidedBy: req.requestedById,
        },
      });
      computed = {
        entity: "ServiceIncome",
        entityId: row.id,
        details: {
          serviceDate: row.serviceDate.toISOString(),
          amount: Number(row.amount),
          voidReason: req.reason,
          requestedBy: req.requestedById,
          approvedBy: session.userId,
          voidRequestId: req.id,
        },
      };
    } else if (req.entity === "EXPENSE") {
      const row = await tx.expense.findUnique({
        where: { id: req.entityId },
        select: {
          id: true,
          isDeleted: true,
          type: true,
          claimedBy: true,
          receivedBy: true,
          amount: true,
          date: true,
        },
      });
      if (!row || row.isDeleted) {
        throw new Error("Expense is no longer active.");
      }
      await tx.expense.update({
        where: { id: req.entityId },
        data: {
          isDeleted: true,
          voidReason: req.reason,
          voidedAt: new Date(),
          voidedBy: req.requestedById,
        },
      });
      computed = {
        entity: "Expense",
        entityId: row.id,
        details: {
          type: row.type,
          claimedBy: row.claimedBy,
          receivedBy: row.receivedBy,
          amount: Number(row.amount),
          date: row.date.toISOString(),
          voidReason: req.reason,
          requestedBy: req.requestedById,
          approvedBy: session.userId,
          voidRequestId: req.id,
        },
      };
    } else {
      throw new Error("Unsupported void request entity.");
    }

    await tx.voidRequest.update({
      where: { id: req.id },
      data: {
        status: "APPROVED",
        reviewedById: session.userId,
        reviewedAt: new Date(),
      },
    });

    if (!computed) throw new Error("Failed to build void approval log.");
    return computed;
  });

  await logAction({
    action: "VOID_APPROVED",
    entity: logParams.entity,
    entityId: logParams.entityId,
    details: logParams.details,
  });

  redirect("/void-requests");
}

export async function declineVoidRequestAction(requestId: string, formData: FormData) {
  const session = await requireRole(["ADMIN"] satisfies Role[]);
  const declineNote = String(formData.get("declineNote") ?? "").trim();

  const req = await prisma.voidRequest.findUnique({
    where: { id: requestId },
  });
  if (!req || req.status !== "PENDING") {
    throw new Error("Void request not found or already handled.");
  }

  const noteFinal =
    declineNote.length > 0
      ? declineNote.slice(0, 500)
      : "Declined by administrator (no note provided).";

  await prisma.voidRequest.update({
    where: { id: requestId },
    data: {
      status: "DECLINED",
      reviewedById: session.userId,
      reviewedAt: new Date(),
      declineNote: noteFinal,
    },
  });

  await logAction({
    action: "VOID_DECLINED",
    entity: "VoidRequest",
    entityId: req.id,
    details: {
      targetEntity: req.entity,
      targetId: req.entityId,
      voidRequestId: req.id,
      reason: req.reason,
      requestedBy: req.requestedById,
      declinedBy: session.userId,
      declineNote: noteFinal,
    },
  });

  redirect("/void-requests");
}
