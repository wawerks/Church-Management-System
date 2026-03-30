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
    .max(200, "Type name is too long"),
});

const ExpenseTypeConfigSchema = z.object({
  allocationPercent: z.coerce
    .number()
    .min(0, "Allocation must be at least 0%")
    .max(100, "Allocation cannot be more than 100%"),
  isAllocatedFromServiceIncome: z.boolean(),
});

const BulkPayloadSchema = z.array(
  z.object({
    id: z.string().min(1),
    allocationPercent: z.coerce
      .number()
      .min(0, "Allocation must be at least 0%")
      .max(100, "Allocation cannot be more than 100%"),
    isAllocatedFromServiceIncome: z.boolean(),
  }),
);

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

export async function updateExpenseTypeConfigAction(id: string, formData: FormData) {
  await requireRole(["ADMIN"] satisfies Role[]);

  const parsed = ExpenseTypeConfigSchema.safeParse({
    allocationPercent: formData.get("allocationPercent"),
    isAllocatedFromServiceIncome:
      (formData.get("isAllocatedFromServiceIncome") ?? "") === "on",
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const updated = await prisma.expenseType.update({
    where: { id },
    data: {
      allocationPercent: parsed.data.allocationPercent,
      isAllocatedFromServiceIncome: parsed.data.isAllocatedFromServiceIncome,
    },
    select: {
      id: true,
      name: true,
      allocationPercent: true,
      isAllocatedFromServiceIncome: true,
    },
  });

  await logAction({
    action: "UPDATE",
    entity: "ExpenseType",
    entityId: updated.id,
    details: {
      name: updated.name,
      allocationPercent: updated.allocationPercent.toString(),
      isAllocatedFromServiceIncome: updated.isAllocatedFromServiceIncome,
    },
  });

  redirect("/expenses/types");
}

export async function updateExpenseTypesBulkConfigAction(formData: FormData) {
  await requireRole(["ADMIN"] satisfies Role[]);

  const raw = (formData.get("payload") ?? "") as string;
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new Error("Invalid bulk payload");
  }

  const parsed = BulkPayloadSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid bulk payload");
  }

  const updates = parsed.data;
  await prisma.$transaction(
    updates.map((u) =>
      prisma.expenseType.update({
        where: { id: u.id },
        data: {
          allocationPercent: u.allocationPercent,
          isAllocatedFromServiceIncome: u.isAllocatedFromServiceIncome,
        },
        select: { id: true, name: true, allocationPercent: true, isAllocatedFromServiceIncome: true },
      }),
    ),
  );

  await logAction({
    action: "UPDATE_BULK",
    entity: "ExpenseType",
    details: {
      updatedCount: updates.length,
    },
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
