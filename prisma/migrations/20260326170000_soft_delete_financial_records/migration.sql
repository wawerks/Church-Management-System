-- Soft delete + void metadata for financial records
ALTER TABLE `Donation`
  ADD COLUMN `isDeleted` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `voidReason` VARCHAR(191) NULL,
  ADD COLUMN `voidedAt` DATETIME(3) NULL,
  ADD COLUMN `voidedBy` VARCHAR(191) NULL;

ALTER TABLE `ServiceIncome`
  ADD COLUMN `isDeleted` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `voidReason` VARCHAR(191) NULL,
  ADD COLUMN `voidedAt` DATETIME(3) NULL,
  ADD COLUMN `voidedBy` VARCHAR(191) NULL;

ALTER TABLE `Expense`
  ADD COLUMN `isDeleted` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `voidReason` VARCHAR(191) NULL,
  ADD COLUMN `voidedAt` DATETIME(3) NULL,
  ADD COLUMN `voidedBy` VARCHAR(191) NULL;
