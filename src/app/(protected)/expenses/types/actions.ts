"use server";

import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import type { Role } from "@/generated/prisma/enums";

const ExpenseTypeSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Type name must be at least 2 characters")
    .max(50, "Type name is too long"),
});

export async function createExpenseTypeAction(formData: FormData) {
  await requireRole(["ADMIN"] satisfies Role[]);

  const parsed = ExpenseTypeSchema.safeParse({
    name: (formData.get("name") ?? "") as string,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  await prisma.expenseType.create({
    data: { name: parsed.data.name },
  });

  redirect("/expenses/types");
}

export async function deleteExpenseTypeAction(id: string) {
  await requireRole(["ADMIN"] satisfies Role[]);
  await prisma.expenseType.delete({ where: { id } });
  redirect("/expenses/types");
}
