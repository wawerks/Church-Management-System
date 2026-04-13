import { prisma } from "@/lib/prisma";
import { computeWorkbookPeriod } from "@/lib/workbook-finance";

type DecimalLike = { toString(): string } | number | null | undefined;
const asNumber = (value: DecimalLike) =>
  value === null || value === undefined ? 0 : Number(value.toString());

export const DEFAULT_ACTIVITY_TEMPLATES: Array<{
  name: string;
  category: "CORE" | "PROJECT" | "SUPPORT";
  standardPct: number;
  sortOrder: number;
}> = [
  { name: "Monthly Prayer and Thanksgiving Session", category: "CORE", standardPct: 0.01, sortOrder: 10 },
  { name: "Evangelism/Discipleship/Revival/Children's Vacation Bible School (VBS)/Camp", category: "CORE", standardPct: 0.03, sortOrder: 20 },
  { name: "Pastor's Appreciation", category: "CORE", standardPct: 0.005, sortOrder: 30 },
  { name: "Conference Calls Attendance", category: "CORE", standardPct: 0.02, sortOrder: 40 },
  { name: "Thanksgiving Celebration and Christmas Celebration", category: "CORE", standardPct: 0.03, sortOrder: 50 },
  { name: "Youth Fellowship", category: "CORE", standardPct: 0.03, sortOrder: 60 },
  { name: "Floor Tiling/Pathway/Youth Center/Lot Survey/Perimeter Fencing", category: "PROJECT", standardPct: 0.02, sortOrder: 110 },
  { name: "Mission", category: "SUPPORT", standardPct: 0.01, sortOrder: 210 },
  { name: "ARM", category: "SUPPORT", standardPct: 0.01, sortOrder: 220 },
  { name: "Conference Contribution", category: "SUPPORT", standardPct: 0.07, sortOrder: 230 },
  { name: "LLBC Aid", category: "SUPPORT", standardPct: 0.01, sortOrder: 240 },
  { name: "Host Pastor's Honorarium", category: "SUPPORT", standardPct: 0.42, sortOrder: 250 },
  { name: "Assistant Pastor's Allowance", category: "SUPPORT", standardPct: 0.175, sortOrder: 260 },
  { name: "Treasurer's Honorarium", category: "SUPPORT", standardPct: 0.03, sortOrder: 270 },
  { name: "Church Maintenance", category: "SUPPORT", standardPct: 0.03, sortOrder: 280 },
  { name: "Electricity", category: "SUPPORT", standardPct: 0.025, sortOrder: 290 },
  { name: "Musical Equipment/Sound System Maintenance", category: "SUPPORT", standardPct: 0.01, sortOrder: 300 },
];

export async function ensureDefaultWorkbookSetup() {
  const [janAprRule, mayDecRule] = await Promise.all([
    prisma.financialRuleSet.upsert({
      where: { id: "workbook-rule-jan-apr" },
      update: {
        name: "Workbook Jan-Apr Rule",
        effectiveFrom: new Date("2025-01-01T00:00:00.000Z"),
        effectiveTo: new Date("2025-05-01T00:00:00.000Z"),
        conferencePercent: 10,
        missionPercent: 1,
        armPercent: 1,
        llbcPercent: 1,
        isActive: true,
      },
      create: {
        id: "workbook-rule-jan-apr",
        name: "Workbook Jan-Apr Rule",
        effectiveFrom: new Date("2025-01-01T00:00:00.000Z"),
        effectiveTo: new Date("2025-05-01T00:00:00.000Z"),
        conferencePercent: 10,
        missionPercent: 1,
        armPercent: 1,
        llbcPercent: 1,
        isActive: true,
      },
    }),
    prisma.financialRuleSet.upsert({
      where: { id: "workbook-rule-may-dec" },
      update: {
        name: "Workbook May-Dec Rule",
        effectiveFrom: new Date("2025-05-01T00:00:00.000Z"),
        effectiveTo: null,
        conferencePercent: 7,
        missionPercent: 1,
        armPercent: 1,
        llbcPercent: 1,
        isActive: true,
      },
      create: {
        id: "workbook-rule-may-dec",
        name: "Workbook May-Dec Rule",
        effectiveFrom: new Date("2025-05-01T00:00:00.000Z"),
        effectiveTo: null,
        conferencePercent: 7,
        missionPercent: 1,
        armPercent: 1,
        llbcPercent: 1,
        isActive: true,
      },
    }),
  ]);

  for (const template of DEFAULT_ACTIVITY_TEMPLATES) {
    await prisma.financialActivityTemplate.upsert({
      where: { name_category: { name: template.name, category: template.category } },
      update: { standardPct: template.standardPct, sortOrder: template.sortOrder, isActive: true },
      create: template,
    });
  }

  return { janAprRule, mayDecRule };
}

export async function ensureFinancialPeriod(monthKey: string) {
  const year = Number(monthKey.slice(0, 4));
  const month = Number(monthKey.slice(5, 7));
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));

  const rule = await prisma.financialRuleSet.findFirst({
    where: {
      isActive: true,
      effectiveFrom: { lte: start },
      OR: [{ effectiveTo: null }, { effectiveTo: { gt: start } }],
    },
    orderBy: { effectiveFrom: "desc" },
  });

  return prisma.financialPeriod.upsert({
    where: { monthKey },
    update: {
      periodStart: start,
      periodEndExclusive: end,
      ruleSetId: rule?.id ?? null,
    },
    create: {
      monthKey,
      title: monthKey,
      periodStart: start,
      periodEndExclusive: end,
      openingBalance: 0,
      ruleSetId: rule?.id ?? null,
    },
  });
}

export async function recomputeFinancialPeriod(monthKey: string) {
  const period = await prisma.financialPeriod.findUnique({
    where: { monthKey },
    include: {
      incomeEntries: { orderBy: { sortOrder: "asc" } },
      activityLedgers: true,
      ruleSet: true,
    },
  });
  if (!period) throw new Error(`Period ${monthKey} not found`);

  const templates = await prisma.financialActivityTemplate.findMany({
    where: { isActive: true },
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
  });

  const currentLedgers = period.activityLedgers;
  const ledgerSeed = templates.map((template) => {
    const existing = currentLedgers.find((x) => x.activityId === template.id);
    return {
      activityId: template.id,
      carryOverIn: asNumber(existing?.carryOverIn),
      adjustmentAmount: asNumber(existing?.adjustmentAmount),
      expenseAmount: asNumber(existing?.expenseAmount),
    };
  });

  const result = computeWorkbookPeriod({
    openingBalance: asNumber(period.openingBalance),
    incomeEntries: period.incomeEntries.map((entry) => ({
      label: entry.label,
      amount: asNumber(entry.amount),
      sortOrder: entry.sortOrder,
    })),
    templates: templates.map((template) => ({
      id: template.id,
      name: template.name,
      category: template.category,
      standardPct: asNumber(template.standardPct),
      sortOrder: template.sortOrder,
    })),
    ledgers: ledgerSeed,
    ruleSet: {
      conferencePercent: asNumber(period.ruleSet?.conferencePercent ?? 7),
      missionPercent: asNumber(period.ruleSet?.missionPercent ?? 1),
      armPercent: asNumber(period.ruleSet?.armPercent ?? 1),
      llbcPercent: asNumber(period.ruleSet?.llbcPercent ?? 1),
    },
  });

  await prisma.$transaction(async (tx) => {
    await tx.financialPeriod.update({
      where: { id: period.id },
      data: {
        monthlyIncome: result.monthlyIncome,
        allocatedBudget: result.allocatedBudget,
        actualExpenses: result.actualExpenses,
        adjustmentAmount: result.adjustmentAmount,
        closingBalance: result.closingBalance,
      },
    });

    for (const row of result.ledgers) {
      await tx.financialActivityLedger.upsert({
        where: { periodId_activityId: { periodId: period.id, activityId: row.activityId } },
        update: {
          standardPct: row.standardPct,
          carryOverIn: row.carryOverIn,
          allocatedAmount: row.allocatedAmount,
          adjustmentAmount: row.adjustmentAmount,
          expenseAmount: row.expenseAmount,
          endingBalance: row.endingBalance,
        },
        create: {
          periodId: period.id,
          activityId: row.activityId,
          standardPct: row.standardPct,
          carryOverIn: row.carryOverIn,
          allocatedAmount: row.allocatedAmount,
          adjustmentAmount: row.adjustmentAmount,
          expenseAmount: row.expenseAmount,
          endingBalance: row.endingBalance,
        },
      });
    }

    await tx.financialRemittanceLedger.upsert({
      where: { periodId: period.id },
      update: result.remittance,
      create: { periodId: period.id, ...result.remittance },
    });

    await tx.financialConferenceMonthly.upsert({
      where: { monthKey: period.monthKey },
      update: {
        periodId: period.id,
        income: result.monthlyIncome,
        actualExpenses: result.actualExpenses,
        actualRemittance: result.remittance.totalRemittance,
        missionAmount: result.remittance.missionAmount,
        armAmount: result.remittance.armAmount,
        llbcAmount: result.remittance.llbcAmount,
        conferenceAmount: result.remittance.conferenceAmount,
        netBalance: result.closingBalance,
        appliedPercent: result.remittance.conferencePercent,
      },
      create: {
        monthKey: period.monthKey,
        periodId: period.id,
        income: result.monthlyIncome,
        actualExpenses: result.actualExpenses,
        actualRemittance: result.remittance.totalRemittance,
        missionAmount: result.remittance.missionAmount,
        armAmount: result.remittance.armAmount,
        llbcAmount: result.remittance.llbcAmount,
        conferenceAmount: result.remittance.conferenceAmount,
        netBalance: result.closingBalance,
        appliedPercent: result.remittance.conferencePercent,
      },
    });
  });

  return result;
}
