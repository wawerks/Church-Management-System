export type WorkbookActivityCategory = "CORE" | "PROJECT" | "SUPPORT";

export type WorkbookActivityTemplate = {
  id: string;
  name: string;
  category: WorkbookActivityCategory;
  standardPct: number;
  sortOrder: number;
};

export type WorkbookIncomeEntry = {
  label: string;
  amount: number;
  sortOrder: number;
};

export type WorkbookLedgerInput = {
  activityId: string;
  carryOverIn: number;
  adjustmentAmount?: number;
  expenseAmount?: number;
};

export type WorkbookRuleSet = {
  conferencePercent: number;
  missionPercent: number;
  armPercent: number;
  llbcPercent: number;
};

export type WorkbookLedgerResult = {
  activityId: string;
  standardPct: number;
  carryOverIn: number;
  allocatedAmount: number;
  adjustmentAmount: number;
  expenseAmount: number;
  endingBalance: number;
};

export type WorkbookComputationResult = {
  monthlyIncome: number;
  allocatedBudget: number;
  actualExpenses: number;
  adjustmentAmount: number;
  closingBalance: number;
  ledgers: WorkbookLedgerResult[];
  remittance: {
    incomeBase: number;
    conferencePercent: number;
    missionPercent: number;
    armPercent: number;
    llbcPercent: number;
    conferenceAmount: number;
    missionAmount: number;
    armAmount: number;
    llbcAmount: number;
    totalRemittance: number;
  };
};

const round2 = (value: number) => Math.round(value * 100) / 100;

export function computeWorkbookPeriod(args: {
  openingBalance: number;
  incomeEntries: WorkbookIncomeEntry[];
  templates: WorkbookActivityTemplate[];
  ledgers: WorkbookLedgerInput[];
  ruleSet: WorkbookRuleSet;
}): WorkbookComputationResult {
  const monthlyIncome = round2(
    args.incomeEntries.reduce((sum, entry) => sum + entry.amount, 0),
  );

  const byActivity = new Map(args.ledgers.map((entry) => [entry.activityId, entry]));
  const results: WorkbookLedgerResult[] = [];
  let actualExpenses = 0;
  let adjustmentAmount = 0;

  for (const template of args.templates) {
    const seed = byActivity.get(template.id);
    const carryOverIn = round2(seed?.carryOverIn ?? 0);
    const adjustment = round2(seed?.adjustmentAmount ?? 0);
    const expense = round2(seed?.expenseAmount ?? 0);
    const allocated = round2(monthlyIncome * template.standardPct);
    const ending = round2(carryOverIn + allocated + adjustment - expense);

    actualExpenses = round2(actualExpenses + expense);
    adjustmentAmount = round2(adjustmentAmount + adjustment);

    results.push({
      activityId: template.id,
      standardPct: template.standardPct,
      carryOverIn,
      allocatedAmount: allocated,
      adjustmentAmount: adjustment,
      expenseAmount: expense,
      endingBalance: ending,
    });
  }

  const allocatedBudget = round2(
    results.reduce((sum, row) => sum + row.allocatedAmount, 0),
  );

  const closingBalance = round2(
    args.openingBalance + allocatedBudget + adjustmentAmount - actualExpenses,
  );

  const incomeBase = monthlyIncome;
  const conferenceAmount = round2((incomeBase * args.ruleSet.conferencePercent) / 100);
  const missionAmount = round2((incomeBase * args.ruleSet.missionPercent) / 100);
  const armAmount = round2((incomeBase * args.ruleSet.armPercent) / 100);
  const llbcAmount = round2((incomeBase * args.ruleSet.llbcPercent) / 100);
  const totalRemittance = round2(
    conferenceAmount + missionAmount + armAmount + llbcAmount,
  );

  return {
    monthlyIncome,
    allocatedBudget,
    actualExpenses,
    adjustmentAmount,
    closingBalance,
    ledgers: results,
    remittance: {
      incomeBase,
      conferencePercent: args.ruleSet.conferencePercent,
      missionPercent: args.ruleSet.missionPercent,
      armPercent: args.ruleSet.armPercent,
      llbcPercent: args.ruleSet.llbcPercent,
      conferenceAmount,
      missionAmount,
      armAmount,
      llbcAmount,
      totalRemittance,
    },
  };
}
