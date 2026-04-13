"use server";

import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/action-log";
import { redirect } from "next/navigation";
import type { Role } from "@/generated/prisma/enums";
import { markPendingVoidRequestsSuperseded } from "@/lib/void-pending";
import { assertFinancialPeriodWritableByDate } from "@/lib/financial-period-guard";

const ExpenseSchema = z.object({
  type: z.string().min(1),
  receivedBy: z.string().trim().min(2),
  date: z.string().min(1),
  amount: z.coerce.number().positive().optional(),
  useSuggestedAmount: z.boolean(),
  budgetMonth: z
    .string()
    .regex(/^\d{4}-\d{2}$/, "Invalid budget month")
    .optional(),
});

export async function createExpenseAction(formData: FormData) {
  await requireRole(["ADMIN", "STAFF", "TREASURER"] satisfies Role[]);

  const parsed = ExpenseSchema.safeParse({
    type: (formData.get("type") ?? "") as string,
    receivedBy: (formData.get("receivedBy") ?? "") as string,
    date: (formData.get("date") ?? "") as string,
    amount: formData.get("amount"),
    useSuggestedAmount: (formData.get("useSuggestedAmount") ?? "") === "on",
    budgetMonth: (formData.get("budgetMonth") ?? undefined) as string | undefined,
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const { type, receivedBy, date, amount, useSuggestedAmount, budgetMonth } =
    parsed.data;
  const expenseDate = new Date(date);
  if (Number.isNaN(expenseDate.getTime())) {
    throw new Error("Invalid date");
  }
  await assertFinancialPeriodWritableByDate(expenseDate);

  const validType = await prisma.expenseType.findUnique({
    where: { name: type },
    select: { id: true, allocationPercent: true, isAllocatedFromServiceIncome: true },
  });
  if (!validType) {
    throw new Error("Invalid expense type");
  }

  const monthStart = new Date(expenseDate);
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const nextMonthStart = new Date(monthStart);
  nextMonthStart.setMonth(nextMonthStart.getMonth() + 1);

  const serviceIncomeAgg = await prisma.serviceIncome.aggregate({
    _sum: { amount: true },
    where: {
      isDeleted: false,
      serviceDate: {
        gte: monthStart,
        lt: nextMonthStart,
      },
    },
  });
  const serviceIncomeMonthTotal = Number(serviceIncomeAgg._sum.amount ?? 0);
  const allocationPercent = Number(validType.allocationPercent);
  const computedAmount = (serviceIncomeMonthTotal * allocationPercent) / 100;
  const shouldAllocate = validType.isAllocatedFromServiceIncome;
  let finalAmount = amount;
  let finalAllocationPercentUsed: number | null = null;
  let finalServiceIncomeMonthTotalUsed: number | null = null;

  if (shouldAllocate && useSuggestedAmount) {
    const spentAgg = await prisma.expense.aggregate({
      _sum: { amount: true },
      where: {
        isDeleted: false,
        type,
        date: {
          gte: monthStart,
          lt: nextMonthStart,
        },
      },
    });

    const spentSoFar = Number(spentAgg._sum.amount ?? 0);
    const remaining = computedAmount - spentSoFar;

    if (!(remaining > 0)) {
      throw new Error(
        "No remaining allocation available for this expense type in the selected month.",
      );
    }

    finalAmount = remaining;

    // Store snapshot values consistent with the amount that was actually saved.
    finalServiceIncomeMonthTotalUsed = serviceIncomeMonthTotal;
    const percentUsed =
      serviceIncomeMonthTotal > 0 ? (remaining / serviceIncomeMonthTotal) * 100 : 0;
    finalAllocationPercentUsed = percentUsed;
  }

  if (finalAmount === undefined || !(finalAmount > 0)) {
    throw new Error(
      shouldAllocate && useSuggestedAmount
        ? "Computed amount must be greater than zero. Add service income for this month or turn off auto-compute."
        : "Amount is required and must be greater than zero.",
    );
  }

  const expense = await prisma.expense.create({
    data: {
      type,
      receivedBy,
      date: expenseDate,
      amount: finalAmount,
      allocationPercentUsed: finalAllocationPercentUsed,
      serviceIncomeMonthTotalUsed: finalServiceIncomeMonthTotalUsed,
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
      allocationPercentUsed: expense.allocationPercentUsed
        ? Number(expense.allocationPercentUsed)
        : null,
      serviceIncomeMonthTotalUsed: expense.serviceIncomeMonthTotalUsed
        ? Number(expense.serviceIncomeMonthTotalUsed)
        : null,
      date: expense.date.toISOString(),
    },
  });

  redirect(budgetMonth ? `/expenses?budgetMonth=${budgetMonth}` : "/expenses");
}

export async function requestVoidExpenseAction(expenseId: string, formData: FormData) {
  const session = await requireRole(["STAFF", "TREASURER"] satisfies Role[]);
  const reason = String(formData.get("voidReason") ?? "").trim();
  if (reason.length < 3) {
    throw new Error("A reason is required for the void request.");
  }

  const existing = await prisma.expense.findUnique({
    where: { id: expenseId },
    select: { id: true, isDeleted: true },
  });
  if (!existing || existing.isDeleted) {
    throw new Error("Expense not found.");
  }

  const dup = await prisma.voidRequest.findFirst({
    where: {
      entity: "EXPENSE",
      entityId: expenseId,
      status: "PENDING",
    },
    select: { id: true },
  });
  if (dup) {
    throw new Error("A void request for this expense is already awaiting admin review.");
  }

  await prisma.voidRequest.create({
    data: {
      entity: "EXPENSE",
      entityId: expenseId,
      requestedById: session.userId,
      reason: reason.slice(0, 500),
    },
  });

  await logAction({
    action: "VOID_REQUEST",
    entity: "Expense",
    entityId: expenseId,
    details: { reason, requestedBy: session.userId },
  });

  redirect("/expenses");
}

export type VoidRequestModalState = { ok: boolean | null; error: string | null };

/**
 * Modal-friendly version for `useFormState`.
 * Returns { ok, error } instead of redirecting.
 */
export async function requestVoidExpenseModalAction(
  expenseId: string,
  _prevState: VoidRequestModalState,
  formData: FormData,
): Promise<VoidRequestModalState> {
  try {
    const session = await requireRole(["STAFF", "TREASURER"] satisfies Role[]);
    const reason = String(formData.get("voidReason") ?? "").trim();
    if (reason.length < 3) {
      return { ok: false, error: "A reason is required for the void request." };
    }

    const existing = await prisma.expense.findUnique({
      where: { id: expenseId },
      select: { id: true, isDeleted: true },
    });
    if (!existing || existing.isDeleted) {
      return { ok: false, error: "Expense not found." };
    }

    const dup = await prisma.voidRequest.findFirst({
      where: {
        entity: "EXPENSE",
        entityId: expenseId,
        status: "PENDING",
      },
      select: { id: true },
    });
    if (dup) {
      return {
        ok: false,
        error: "A void request for this expense is already awaiting admin review.",
      };
    }

    await prisma.voidRequest.create({
      data: {
        entity: "EXPENSE",
        entityId: expenseId,
        requestedById: session.userId,
        reason: reason.slice(0, 500),
      },
    });

    await logAction({
      action: "VOID_REQUEST",
      entity: "Expense",
      entityId: expenseId,
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

export async function voidExpenseAction(expenseId: string, formData: FormData) {
  const session = await requireRole(["ADMIN"] satisfies Role[]);
  const voidReason = String(formData.get("voidReason") ?? "").trim();
  if (voidReason.length < 3) {
    throw new Error("Void reason is required.");
  }

  const existing = await prisma.expense.findUnique({
    where: { id: expenseId },
    select: {
      id: true,
      type: true,
      claimedBy: true,
      receivedBy: true,
      amount: true,
      date: true,
      isDeleted: true,
    },
  });
  if (!existing || existing.isDeleted) {
    throw new Error("Expense not found.");
  }

  await markPendingVoidRequestsSuperseded("EXPENSE", expenseId, session.userId);

  const deleted = await prisma.expense.update({
    where: { id: expenseId },
    data: {
      isDeleted: true,
      voidReason,
      voidedAt: new Date(),
      voidedBy: session.userId,
    },
    select: { id: true, type: true, claimedBy: true, receivedBy: true, amount: true, date: true },
  });
  await logAction({
    action: "VOID",
    entity: "Expense",
    entityId: deleted.id,
    details: {
      type: deleted.type,
      claimedBy: deleted.claimedBy,
      receivedBy: deleted.receivedBy,
      amount: Number(deleted.amount),
      date: deleted.date.toISOString(),
      voidReason,
      voidedBy: session.userId,
    },
  });
  redirect("/expenses");
}
