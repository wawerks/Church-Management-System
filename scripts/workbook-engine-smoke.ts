import { computeWorkbookPeriod } from "../src/lib/workbook-finance";

const result = computeWorkbookPeriod({
  openingBalance: 1000,
  incomeEntries: [
    { label: "Week 1", amount: 5000, sortOrder: 1 },
    { label: "Week 2", amount: 5000, sortOrder: 2 },
  ],
  templates: [
    { id: "a", name: "Activity A", category: "CORE", standardPct: 0.1, sortOrder: 1 },
    { id: "b", name: "Activity B", category: "SUPPORT", standardPct: 0.2, sortOrder: 2 },
  ],
  ledgers: [
    { activityId: "a", carryOverIn: 10, expenseAmount: 100, adjustmentAmount: 0 },
    { activityId: "b", carryOverIn: 20, expenseAmount: 50, adjustmentAmount: 10 },
  ],
  ruleSet: {
    conferencePercent: 7,
    missionPercent: 1,
    armPercent: 1,
    llbcPercent: 1,
  },
});

if (result.monthlyIncome !== 10000) throw new Error("monthlyIncome mismatch");
if (result.allocatedBudget !== 3000) throw new Error("allocatedBudget mismatch");
if (result.actualExpenses !== 150) throw new Error("actualExpenses mismatch");
if (Math.abs(result.closingBalance - 3860) > 0.001) {
  throw new Error(`closingBalance mismatch: ${result.closingBalance}`);
}

console.log("Workbook engine smoke test passed.");
