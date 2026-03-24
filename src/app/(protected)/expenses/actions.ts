"use server";

import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import type { Role } from "@/generated/prisma/enums";

const ExpenseSchema = z.object({
  type: z.string().min(1),
  claimedBy: z.string().trim().min(2),
  date: z.string().min(1),
  amount: z.coerce.number().positive(),
});

export async function createExpenseAction(formData: FormData) {
  await requireRole(["ADMIN", "STAFF"] satisfies Role[]);

  const parsed = ExpenseSchema.safeParse({
    type: (formData.get("type") ?? "") as string,
    claimedBy: (formData.get("claimedBy") ?? "") as string,
    date: (formData.get("date") ?? "") as string,
    amount: formData.get("amount"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const { type, claimedBy, date, amount } = parsed.data;
  const expenseDate = new Date(date);
  if (Number.isNaN(expenseDate.getTime())) {
    throw new Error("Invalid date");
  }

  const validType = await prisma.expenseType.findUnique({
    where: { name: type },
    select: { id: true },
  });
  if (!validType) {
    throw new Error("Invalid expense type");
  }

  await prisma.expense.create({
    data: {
      type,
      claimedBy,
      date: expenseDate,
      amount,
    },
  });

  redirect("/expenses");
}

export async function deleteExpenseAction(expenseId: string) {
  await requireRole(["ADMIN", "STAFF"] satisfies Role[]);
  await prisma.expense.delete({ where: { id: expenseId } });
  redirect("/expenses");
}
