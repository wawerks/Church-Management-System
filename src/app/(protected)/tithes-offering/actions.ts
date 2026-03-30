"use server";

import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/action-log";
import { redirect } from "next/navigation";
import type { Role } from "@/generated/prisma/enums";
import { markPendingVoidRequestsSuperseded } from "@/lib/void-pending";

const ServiceIncomeSchema = z.object({
  serviceDate: z.string().min(1),
  amount: z.coerce.number().positive(),
});

export async function createServiceIncomeAction(formData: FormData) {
  await requireRole(["ADMIN", "STAFF", "TREASURER"] satisfies Role[]);

  const parsed = ServiceIncomeSchema.safeParse({
    serviceDate: (formData.get("serviceDate") ?? "") as string,
    amount: formData.get("amount"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const { serviceDate, amount } = parsed.data;
  const date = new Date(serviceDate);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid service date");
  }

  const entry = await prisma.serviceIncome.upsert({
    where: { serviceDate: date },
    update: {
      amount,
      isDeleted: false,
      voidReason: null,
      voidedAt: null,
      voidedBy: null,
    },
    create: { serviceDate: date, amount },
  });
  await logAction({
    action: "UPSERT",
    entity: "ServiceIncome",
    entityId: entry.id,
    details: { serviceDate: entry.serviceDate.toISOString(), amount: Number(entry.amount) },
  });

  redirect("/tithes-offering");
}

export async function requestVoidServiceIncomeAction(id: string, formData: FormData) {
  const session = await requireRole(["STAFF", "TREASURER"] satisfies Role[]);
  const reason = String(formData.get("voidReason") ?? "").trim();
  if (reason.length < 3) {
    throw new Error("A reason is required for the void request.");
  }

  const existing = await prisma.serviceIncome.findUnique({
    where: { id },
    select: { id: true, isDeleted: true },
  });
  if (!existing || existing.isDeleted) {
    throw new Error("Service income record not found.");
  }

  const dup = await prisma.voidRequest.findFirst({
    where: {
      entity: "SERVICE_INCOME",
      entityId: id,
      status: "PENDING",
    },
    select: { id: true },
  });
  if (dup) {
    throw new Error(
      "A void request for this service income entry is already awaiting admin review.",
    );
  }

  await prisma.voidRequest.create({
    data: {
      entity: "SERVICE_INCOME",
      entityId: id,
      requestedById: session.userId,
      reason: reason.slice(0, 500),
    },
  });

  await logAction({
    action: "VOID_REQUEST",
    entity: "ServiceIncome",
    entityId: id,
    details: { reason, requestedBy: session.userId },
  });

  redirect("/tithes-offering");
}

export async function voidServiceIncomeAction(id: string, formData: FormData) {
  const session = await requireRole(["ADMIN"] satisfies Role[]);
  const voidReason = String(formData.get("voidReason") ?? "").trim();
  if (voidReason.length < 3) {
    throw new Error("Void reason is required.");
  }

  const existing = await prisma.serviceIncome.findUnique({
    where: { id },
    select: { id: true, serviceDate: true, amount: true, isDeleted: true },
  });
  if (!existing || existing.isDeleted) {
    throw new Error("Service income record not found.");
  }

  await markPendingVoidRequestsSuperseded("SERVICE_INCOME", id, session.userId);

  const deleted = await prisma.serviceIncome.update({
    where: { id },
    data: {
      isDeleted: true,
      voidReason,
      voidedAt: new Date(),
      voidedBy: session.userId,
    },
    select: { id: true, serviceDate: true, amount: true },
  });
  await logAction({
    action: "VOID",
    entity: "ServiceIncome",
    entityId: deleted.id,
    details: {
      serviceDate: deleted.serviceDate.toISOString(),
      amount: Number(deleted.amount),
      voidReason,
      voidedBy: session.userId,
    },
  });
  redirect("/tithes-offering");
}
