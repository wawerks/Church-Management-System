"use server";

import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/action-log";
import { redirect } from "next/navigation";
import type { Role } from "@/generated/prisma/enums";

const ExpenseSchema = z.object({
  type: z.string().min(1),
  receivedBy: z.string().trim().min(2),
  date: z.string().min(1),
  amount: z.coerce.number().positive(),
});

export async function createExpenseAction(formData: FormData) {
  await requireRole(["ADMIN", "STAFF", "TREASURER"] satisfies Role[]);

  const parsed = ExpenseSchema.safeParse({
    type: (formData.get("type") ?? "") as string,
    receivedBy: (formData.get("receivedBy") ?? "") as string,
    date: (formData.get("date") ?? "") as string,
    amount: formData.get("amount"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const { type, receivedBy, date, amount } = parsed.data;
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

  const expense = await prisma.expense.create({
    data: {
      type,
      receivedBy,
      date: expenseDate,
      amount,
    },
  });
  await logAction({
    action: "CREATE",
    entity: "Expense",
    entityId: expense.id,
    details: {
      type: expense.type,
      claimedBy: expense.claimedBy,
      receivedBy: expense.receivedBy,
      amount: Number(expense.amount),
      date: expense.date.toISOString(),
    },
  });

  redirect("/expenses");
}

export async function deleteExpenseAction(expenseId: string) {
  await requireRole(["ADMIN", "STAFF", "TREASURER"] satisfies Role[]);
  const deleted = await prisma.expense.delete({
    where: { id: expenseId },
    select: { id: true, type: true, claimedBy: true, receivedBy: true, amount: true, date: true },
  });
  await logAction({
    action: "DELETE",
    entity: "Expense",
    entityId: deleted.id,
    details: {
      type: deleted.type,
      claimedBy: deleted.claimedBy,
      receivedBy: deleted.receivedBy,
      amount: Number(deleted.amount),
      date: deleted.date.toISOString(),
    },
  });
  redirect("/expenses");
}
