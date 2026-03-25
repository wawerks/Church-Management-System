"use server";

import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/action-log";
import { redirect } from "next/navigation";
import type { Role } from "@/generated/prisma/enums";

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

export async function deleteDonationAction(donationId: string) {
  await requireRole(["ADMIN", "STAFF", "TREASURER"] satisfies Role[]);
  const deleted = await prisma.donation.delete({
    where: { id: donationId },
    select: { id: true, memberId: true, amount: true, type: true, date: true },
  });
  await logAction({
    action: "DELETE",
    entity: "Donation",
    entityId: deleted.id,
    details: {
      memberId: deleted.memberId,
      amount: Number(deleted.amount),
      type: deleted.type,
      date: deleted.date.toISOString(),
    },
  });
  redirect("/donations");
}

