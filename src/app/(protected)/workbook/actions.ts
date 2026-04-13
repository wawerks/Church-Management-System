"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { requireRole, requireSession } from "@/lib/auth";
import type { Role } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/action-log";
import {
  ensureDefaultWorkbookSetup,
  ensureFinancialPeriod,
  recomputeFinancialPeriod,
} from "@/lib/workbook-finance-store";

const MonthKeySchema = z.string().regex(/^\d{4}-\d{2}$/);

export async function bootstrapWorkbookAction(formData: FormData) {
  await requireRole(["ADMIN"] satisfies Role[]);
  const monthKey = MonthKeySchema.parse(String(formData.get("monthKey") ?? ""));
  await ensureDefaultWorkbookSetup();
  await ensureFinancialPeriod(monthKey);
  await recomputeFinancialPeriod(monthKey);
  await logAction({
    action: "WORKBOOK_BOOTSTRAP",
    entity: "FinancialPeriod",
    entityId: monthKey,
    details: { monthKey },
  });
  redirect(`/workbook?month=${monthKey}`);
}

const IncomeEntrySchema = z.object({
  monthKey: MonthKeySchema,
  label: z.string().trim().min(1),
  amount: z.coerce.number(),
  sortOrder: z.coerce.number().int().min(0).max(99).default(0),
  kind: z.enum(["OPENING", "WEEKLY", "ADJUSTMENT"]).default("WEEKLY"),
});

export async function upsertIncomeEntryAction(formData: FormData) {
  await requireRole(["ADMIN", "STAFF", "TREASURER"] satisfies Role[]);
  const parsed = IncomeEntrySchema.parse({
    monthKey: String(formData.get("monthKey") ?? ""),
    label: String(formData.get("label") ?? ""),
    amount: formData.get("amount"),
    sortOrder: formData.get("sortOrder") ?? 0,
    kind: String(formData.get("kind") ?? "WEEKLY"),
  });

  const period = await ensureFinancialPeriod(parsed.monthKey);
  if (period.status !== "DRAFT") {
    throw new Error("Only draft periods can be edited.");
  }

  await prisma.financialWeeklyIncomeEntry.upsert({
    where: {
      periodId_sortOrder: {
        periodId: period.id,
        sortOrder: parsed.sortOrder,
      },
    },
    create: {
      periodId: period.id,
      kind: parsed.kind,
      label: parsed.label,
      amount: parsed.amount,
      sortOrder: parsed.sortOrder,
    },
    update: {
      kind: parsed.kind,
      label: parsed.label,
      amount: parsed.amount,
    },
  });

  await recomputeFinancialPeriod(parsed.monthKey);
  await logAction({
    action: "WORKBOOK_INCOME_UPSERT",
    entity: "FinancialPeriod",
    entityId: parsed.monthKey,
    details: parsed,
  });
  redirect(`/workbook?month=${parsed.monthKey}`);
}

const LedgerExpenseSchema = z.object({
  monthKey: MonthKeySchema,
  activityId: z.string().min(1),
  expenseAmount: z.coerce.number().min(0),
  adjustmentAmount: z.coerce.number(),
  remarks: z.string().trim().max(1000).optional(),
});

export async function updateLedgerExpenseAction(formData: FormData) {
  await requireRole(["ADMIN", "STAFF", "TREASURER"] satisfies Role[]);
  const parsed = LedgerExpenseSchema.parse({
    monthKey: String(formData.get("monthKey") ?? ""),
    activityId: String(formData.get("activityId") ?? ""),
    expenseAmount: formData.get("expenseAmount"),
    adjustmentAmount: formData.get("adjustmentAmount") ?? 0,
    remarks: (formData.get("remarks") ?? undefined) as string | undefined,
  });

  const period = await ensureFinancialPeriod(parsed.monthKey);
  if (period.status !== "DRAFT") {
    throw new Error("Only draft periods can be edited.");
  }

  await prisma.financialActivityLedger.upsert({
    where: {
      periodId_activityId: {
        periodId: period.id,
        activityId: parsed.activityId,
      },
    },
    create: {
      periodId: period.id,
      activityId: parsed.activityId,
      standardPct: 0,
      carryOverIn: 0,
      allocatedAmount: 0,
      expenseAmount: parsed.expenseAmount,
      adjustmentAmount: parsed.adjustmentAmount,
      endingBalance: 0,
      remarks: parsed.remarks,
    },
    update: {
      expenseAmount: parsed.expenseAmount,
      adjustmentAmount: parsed.adjustmentAmount,
      remarks: parsed.remarks,
    },
  });

  await recomputeFinancialPeriod(parsed.monthKey);
  await logAction({
    action: "WORKBOOK_LEDGER_UPDATE",
    entity: "FinancialActivityLedger",
    entityId: parsed.activityId,
    details: parsed,
  });
  redirect(`/workbook?month=${parsed.monthKey}`);
}

export async function recomputeWorkbookAction(formData: FormData) {
  await requireRole(["ADMIN", "STAFF", "TREASURER"] satisfies Role[]);
  const monthKey = MonthKeySchema.parse(String(formData.get("monthKey") ?? ""));
  await ensureFinancialPeriod(monthKey);
  await recomputeFinancialPeriod(monthKey);
  await logAction({
    action: "WORKBOOK_RECOMPUTE",
    entity: "FinancialPeriod",
    entityId: monthKey,
    details: { monthKey },
  });
  redirect(`/workbook?month=${monthKey}`);
}

const StatusSchema = z.enum(["DRAFT", "LOCKED", "FINALIZED"]);
export async function setWorkbookPeriodStatusAction(formData: FormData) {
  await requireRole(["ADMIN"] satisfies Role[]);
  const monthKey = MonthKeySchema.parse(String(formData.get("monthKey") ?? ""));
  const status = StatusSchema.parse(String(formData.get("status") ?? ""));
  const period = await ensureFinancialPeriod(monthKey);
  await prisma.financialPeriod.update({
    where: { id: period.id },
    data: { status },
  });
  const session = await requireSession();
  await logAction({
    actor: {
      userId: session.userId,
      name: session.name,
      role: session.role,
    },
    action: "WORKBOOK_PERIOD_STATUS",
    entity: "FinancialPeriod",
    entityId: period.id,
    details: { monthKey, status },
  });
  redirect(`/workbook?month=${monthKey}`);
}
