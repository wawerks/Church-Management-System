"use server";

import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/action-log";
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

  const expenseType = await prisma.expenseType.create({
    data: { name: parsed.data.name },
  });
  await logAction({
    action: "CREATE",
    entity: "ExpenseType",
    entityId: expenseType.id,
    details: { name: expenseType.name },
  });

  redirect("/expenses/types");
}

export async function deleteExpenseTypeAction(id: string) {
  await requireRole(["ADMIN"] satisfies Role[]);
  const deleted = await prisma.expenseType.delete({
    where: { id },
    select: { id: true, name: true },
  });
  await logAction({
    action: "DELETE",
    entity: "ExpenseType",
    entityId: deleted.id,
    details: { name: deleted.name },
  });
  redirect("/expenses/types");
}
