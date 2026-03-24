"use server";

import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import type { Role } from "@/generated/prisma/enums";

const DonationSchema = z.object({
  memberId: z.string().min(1),
  amount: z.coerce.number().positive(),
  type: z.enum(["DONATION", "OTHERS"]),
  date: z.string().min(1),
});

export async function createDonationAction(formData: FormData) {
  await requireRole(["ADMIN", "STAFF"] satisfies Role[]);

  const parsed = DonationSchema.safeParse({
    memberId: (formData.get("memberId") ?? "") as string,
    amount: formData.get("amount"),
    type: (formData.get("type") ?? "") as string,
    date: (formData.get("date") ?? "") as string,
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const { memberId, amount, type, date } = parsed.data;
  const donationDate = new Date(date);

  await prisma.donation.create({
    data: {
      memberId,
      amount,
      type,
      date: donationDate,
    },
  });

  redirect("/donations");
}

export async function deleteDonationAction(donationId: string) {
  await requireRole(["ADMIN", "STAFF"] satisfies Role[]);
  await prisma.donation.delete({ where: { id: donationId } });
  redirect("/donations");
}

