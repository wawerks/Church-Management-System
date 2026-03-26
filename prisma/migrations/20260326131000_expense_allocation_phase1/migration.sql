ALTER TABLE `ExpenseType`
  ADD COLUMN `allocationPercent` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN `isAllocatedFromServiceIncome` BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE `Expense`
  ADD COLUMN `allocationPercentUsed` DECIMAL(5,2) NULL,
  ADD COLUMN `serviceIncomeMonthTotalUsed` DECIMAL(10,2) NULL;
