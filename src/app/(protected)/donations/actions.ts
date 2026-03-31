"use server";

import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/action-log";
import { redirect } from "next/navigation";
import type { Role } from "@/generated/prisma/enums";
import { markPendingVoidRequestsSuperseded } from "@/lib/void-pending";

const DonationSchema = z
  .object({
    memberId: z.string().optional(),
    memberName: z.string().optional(),
    amount: z.coerce.number().positive(),
    type: z.enum(["DONATION", "OTHERS"]),
    date: z.string().min(1),
  })
  .refine((data) => Boolean(data.memberId || data.memberName), {
    message: "Provide either memberId or memberName.",
  });

export async function createDonationAction(formData: FormData) {
  await requireRole(["ADMIN", "STAFF", "TREASURER"] satisfies Role[]);

  const parsed = DonationSchema.safeParse({
    memberId: (formData.get("memberId") ?? "") as string,
    memberName: (formData.get("memberName") ?? "") as string,
    amount: formData.get("amount"),
    type: (formData.get("type") ?? "") as string,
    date: (formData.get("date") ?? "") as string,
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const { memberId, memberName, amount, type, date } = parsed.data;
  const donationDate = new Date(date);

  // Resolve member from either memberId or typed memberName.
  let resolvedMemberId: string | null = null;
  let resolvedMemberName: string | null = null;

  if (memberId) {
    resolvedMemberId = memberId;
  } else if (memberName) {
    const fullName = memberName.trim();
    resolvedMemberName = fullName;

    const parts = fullName.split(/\s+/).filter(Boolean);
    const firstToken = parts[0] ?? "Unknown";
    const lastToken = parts.slice(1).join(" ") || "Unknown";

    const existing = await prisma.member.findFirst({
      where: { AND: [{ firstName: firstToken }, { lastName: lastToken }] },
      select: { id: true },
    });

    if (existing?.id) {
      resolvedMemberId = existing.id;
    } else {
      const created = await prisma.member.create({
        data: {
          firstName: firstToken,
          lastName: lastToken,
        },
        select: { id: true },
      });
      resolvedMemberId = created.id;
    }
  }

  if (!resolvedMemberId) {
    throw new Error("Unable to resolve member for donation.");
  }

  const donation = await prisma.donation.create({
    data: {
      memberId: resolvedMemberId,
      amount,
      type,
      date: donationDate,
    },
  });
  await logAction({
    action: "CREATE",
    entity: "Donation",
    entityId: donation.id,
    details: {
      memberId: resolvedMemberId,
      memberName: resolvedMemberName ?? undefined,
      amount,
      type,
      date: donationDate.toISOString(),
    },
  });

  redirect("/donations");
}

export async function requestVoidDonationAction(donationId: string, formData: FormData) {
  const session = await requireRole(["STAFF", "TREASURER"] satisfies Role[]);
  const reason = String(formData.get("voidReason") ?? "").trim();
  if (reason.length < 3) {
    throw new Error("A reason is required for the void request.");
  }

  const existing = await prisma.donation.findUnique({
    where: { id: donationId },
    select: { id: true, isDeleted: true },
  });
  if (!existing || existing.isDeleted) {
    throw new Error("Donation not found.");
  }

  const dup = await prisma.voidRequest.findFirst({
    where: {
      entity: "DONATION",
      entityId: donationId,
      status: "PENDING",
    },
    select: { id: true },
  });
  if (dup) {
    throw new Error("A void request for this donation is already awaiting admin review.");
  }

  await prisma.voidRequest.create({
    data: {
      entity: "DONATION",
      entityId: donationId,
      requestedById: session.userId,
      reason: reason.slice(0, 500),
    },
  });

  await logAction({
    action: "VOID_REQUEST",
    entity: "Donation",
    entityId: donationId,
    details: { reason, requestedBy: session.userId },
  });

  redirect("/donations");
}

export type VoidRequestModalState = { ok: boolean | null; error: string | null };

/**
 * Modal-friendly version for `useFormState`.
 * Returns { ok, error } instead of redirecting.
 */
export async function requestVoidDonationModalAction(
  donationId: string,
  _prevState: VoidRequestModalState,
  formData: FormData,
): Promise<VoidRequestModalState> {
  try {
    const session = await requireRole(["STAFF", "TREASURER"] satisfies Role[]);
    const reason = String(formData.get("voidReason") ?? "").trim();
    if (reason.length < 3) {
      return { ok: false, error: "A reason is required for the void request." };
    }

    const existing = await prisma.donation.findUnique({
      where: { id: donationId },
      select: { id: true, isDeleted: true },
    });
    if (!existing || existing.isDeleted) {
      return { ok: false, error: "Donation not found." };
    }

    const dup = await prisma.voidRequest.findFirst({
      where: {
        entity: "DONATION",
        entityId: donationId,
        status: "PENDING",
      },
      select: { id: true },
    });
    if (dup) {
      return {
        ok: false,
        error: "A void request for this donation is already awaiting admin review.",
      };
    }

    await prisma.voidRequest.create({
      data: {
        entity: "DONATION",
        entityId: donationId,
        requestedById: session.userId,
        reason: reason.slice(0, 500),
      },
    });

    await logAction({
      action: "VOID_REQUEST",
      entity: "Donation",
      entityId: donationId,
      details: { reason, requestedBy: session.userId },
    });

    return { ok: true, error: null };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Unable to submit void request.",
    };
  }
}

export async function voidDonationAction(donationId: string, formData: FormData) {
  const session = await requireRole(["ADMIN"] satisfies Role[]);
  const voidReason = String(formData.get("voidReason") ?? "").trim();
  if (voidReason.length < 3) {
    throw new Error("Void reason is required.");
  }

  const existing = await prisma.donation.findUnique({
    where: { id: donationId },
    select: {
      id: true,
      memberId: true,
      amount: true,
      type: true,
      date: true,
      isDeleted: true,
    },
  });
  if (!existing || existing.isDeleted) {
    throw new Error("Donation not found.");
  }

  await markPendingVoidRequestsSuperseded("DONATION", donationId, session.userId);

  const deleted = await prisma.donation.update({
    where: { id: donationId },
    data: {
      isDeleted: true,
      voidReason,
      voidedAt: new Date(),
      voidedBy: session.userId,
    },
    select: { id: true, memberId: true, amount: true, type: true, date: true },
  });
  await logAction({
    action: "VOID",
    entity: "Donation",
    entityId: deleted.id,
    details: {
      memberId: deleted.memberId,
      amount: Number(deleted.amount),
      type: deleted.type,
      date: deleted.date.toISOString(),
      voidReason,
      voidedBy: session.userId,
    },
  });
  redirect("/donations");
}

