-- Workbook financial planning domain

CREATE TABLE `FinancialRuleSet` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `effectiveFrom` DATETIME(3) NOT NULL,
  `effectiveTo` DATETIME(3) NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `conferencePercent` DECIMAL(5,2) NOT NULL,
  `missionPercent` DECIMAL(5,2) NOT NULL,
  `armPercent` DECIMAL(5,2) NOT NULL,
  `llbcPercent` DECIMAL(5,2) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `FinancialRuleSet_effectiveFrom_effectiveTo_idx` ON `FinancialRuleSet`(`effectiveFrom`, `effectiveTo`);

CREATE TABLE `FinancialActivityTemplate` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `category` ENUM('CORE', 'PROJECT', 'SUPPORT') NOT NULL,
  `standardPct` DECIMAL(7,4) NOT NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `sortOrder` INTEGER NOT NULL DEFAULT 0,
  `expenseTypeId` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `FinancialActivityTemplate_expenseTypeId_key`(`expenseTypeId`),
  UNIQUE INDEX `FinancialActivityTemplate_name_category_key`(`name`, `category`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `FinancialActivityTemplate_category_sortOrder_isActive_idx` ON `FinancialActivityTemplate`(`category`, `sortOrder`, `isActive`);

CREATE TABLE `FinancialPeriod` (
  `id` VARCHAR(191) NOT NULL,
  `monthKey` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NULL,
  `status` ENUM('DRAFT', 'LOCKED', 'FINALIZED') NOT NULL DEFAULT 'DRAFT',
  `openingBalance` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `monthlyIncome` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `allocatedBudget` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `actualExpenses` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `closingBalance` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `adjustmentAmount` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `periodStart` DATETIME(3) NOT NULL,
  `periodEndExclusive` DATETIME(3) NOT NULL,
  `ruleSetId` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `FinancialPeriod_monthKey_key`(`monthKey`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `FinancialPeriod_periodStart_periodEndExclusive_idx` ON `FinancialPeriod`(`periodStart`, `periodEndExclusive`);
CREATE INDEX `FinancialPeriod_status_periodStart_idx` ON `FinancialPeriod`(`status`, `periodStart`);

CREATE TABLE `FinancialWeeklyIncomeEntry` (
  `id` VARCHAR(191) NOT NULL,
  `periodId` VARCHAR(191) NOT NULL,
  `kind` ENUM('OPENING', 'WEEKLY', 'ADJUSTMENT') NOT NULL DEFAULT 'WEEKLY',
  `label` VARCHAR(191) NOT NULL,
  `sortOrder` INTEGER NOT NULL DEFAULT 0,
  `amount` DECIMAL(12,2) NOT NULL,
  `entryDate` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `FinancialWeeklyIncomeEntry_periodId_sortOrder_key`(`periodId`, `sortOrder`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `FinancialWeeklyIncomeEntry_periodId_sortOrder_idx` ON `FinancialWeeklyIncomeEntry`(`periodId`, `sortOrder`);

CREATE TABLE `FinancialActivityLedger` (
  `id` VARCHAR(191) NOT NULL,
  `periodId` VARCHAR(191) NOT NULL,
  `activityId` VARCHAR(191) NOT NULL,
  `standardPct` DECIMAL(7,4) NOT NULL,
  `carryOverIn` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `allocatedAmount` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `adjustmentAmount` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `expenseAmount` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `endingBalance` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `remarks` VARCHAR(1000) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `FinancialActivityLedger_periodId_activityId_key`(`periodId`, `activityId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `FinancialActivityLedger_activityId_periodId_idx` ON `FinancialActivityLedger`(`activityId`, `periodId`);

CREATE TABLE `FinancialRemittanceLedger` (
  `id` VARCHAR(191) NOT NULL,
  `periodId` VARCHAR(191) NOT NULL,
  `incomeBase` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `conferencePercent` DECIMAL(5,2) NOT NULL,
  `missionPercent` DECIMAL(5,2) NOT NULL,
  `armPercent` DECIMAL(5,2) NOT NULL,
  `llbcPercent` DECIMAL(5,2) NOT NULL,
  `conferenceAmount` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `missionAmount` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `armAmount` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `llbcAmount` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `totalRemittance` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `FinancialRemittanceLedger_periodId_key`(`periodId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `FinancialMonthlySnapshot` (
  `id` VARCHAR(191) NOT NULL,
  `periodId` VARCHAR(191) NOT NULL,
  `totalIncome` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `totalExpense` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `totalRemittance` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `netBalance` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `conferenceAmount` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `missionAmount` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `armAmount` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `llbcAmount` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `createdByUserId` VARCHAR(191) NULL,
  `snapshotNote` VARCHAR(1000) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `FinancialMonthlySnapshot_periodId_createdAt_idx` ON `FinancialMonthlySnapshot`(`periodId`, `createdAt`);

CREATE TABLE `FinancialMonthlySnapshotActivity` (
  `id` VARCHAR(191) NOT NULL,
  `snapshotId` VARCHAR(191) NOT NULL,
  `activityId` VARCHAR(191) NOT NULL,
  `standardPct` DECIMAL(7,4) NOT NULL,
  `carryOverIn` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `allocatedAmount` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `adjustmentAmount` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `expenseAmount` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `endingBalance` DECIMAL(12,2) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `FinancialMonthlySnapshotActivity_snapshotId_activityId_key`(`snapshotId`, `activityId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `FinancialConferenceMonthly` (
  `id` VARCHAR(191) NOT NULL,
  `monthKey` VARCHAR(191) NOT NULL,
  `periodId` VARCHAR(191) NULL,
  `income` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `actualExpenses` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `actualRemittance` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `missionAmount` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `armAmount` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `llbcAmount` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `conferenceAmount` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `netBalance` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `appliedPercent` DECIMAL(5,2) NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `FinancialConferenceMonthly_monthKey_key`(`monthKey`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `FinancialConferenceMonthly_periodId_idx` ON `FinancialConferenceMonthly`(`periodId`);

CREATE TABLE `FinancialImportBatch` (
  `id` VARCHAR(191) NOT NULL,
  `sourceFile` VARCHAR(191) NOT NULL,
  `sourceHash` VARCHAR(191) NULL,
  `importedByUserId` VARCHAR(191) NULL,
  `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `finishedAt` DATETIME(3) NULL,
  `status` VARCHAR(191) NOT NULL,
  `summary` JSON NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `FinancialImportEntry` (
  `id` VARCHAR(191) NOT NULL,
  `batchId` VARCHAR(191) NOT NULL,
  `sourceSheet` VARCHAR(191) NOT NULL,
  `sourceRow` INTEGER NULL,
  `sourceCol` INTEGER NULL,
  `recordType` VARCHAR(191) NOT NULL,
  `targetId` VARCHAR(191) NULL,
  `payload` JSON NULL,
  `error` VARCHAR(1000) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `FinancialImportEntry_batchId_sourceSheet_idx` ON `FinancialImportEntry`(`batchId`, `sourceSheet`);

ALTER TABLE `FinancialActivityTemplate` ADD CONSTRAINT `FinancialActivityTemplate_expenseTypeId_fkey`
  FOREIGN KEY (`expenseTypeId`) REFERENCES `ExpenseType`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `FinancialPeriod` ADD CONSTRAINT `FinancialPeriod_ruleSetId_fkey`
  FOREIGN KEY (`ruleSetId`) REFERENCES `FinancialRuleSet`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `FinancialWeeklyIncomeEntry` ADD CONSTRAINT `FinancialWeeklyIncomeEntry_periodId_fkey`
  FOREIGN KEY (`periodId`) REFERENCES `FinancialPeriod`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `FinancialActivityLedger` ADD CONSTRAINT `FinancialActivityLedger_periodId_fkey`
  FOREIGN KEY (`periodId`) REFERENCES `FinancialPeriod`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `FinancialActivityLedger` ADD CONSTRAINT `FinancialActivityLedger_activityId_fkey`
  FOREIGN KEY (`activityId`) REFERENCES `FinancialActivityTemplate`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `FinancialRemittanceLedger` ADD CONSTRAINT `FinancialRemittanceLedger_periodId_fkey`
  FOREIGN KEY (`periodId`) REFERENCES `FinancialPeriod`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `FinancialMonthlySnapshot` ADD CONSTRAINT `FinancialMonthlySnapshot_periodId_fkey`
  FOREIGN KEY (`periodId`) REFERENCES `FinancialPeriod`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `FinancialMonthlySnapshotActivity` ADD CONSTRAINT `FinancialMonthlySnapshotActivity_snapshotId_fkey`
  FOREIGN KEY (`snapshotId`) REFERENCES `FinancialMonthlySnapshot`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `FinancialMonthlySnapshotActivity` ADD CONSTRAINT `FinancialMonthlySnapshotActivity_activityId_fkey`
  FOREIGN KEY (`activityId`) REFERENCES `FinancialActivityTemplate`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `FinancialConferenceMonthly` ADD CONSTRAINT `FinancialConferenceMonthly_periodId_fkey`
  FOREIGN KEY (`periodId`) REFERENCES `FinancialPeriod`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `FinancialImportEntry` ADD CONSTRAINT `FinancialImportEntry_batchId_fkey`
  FOREIGN KEY (`batchId`) REFERENCES `FinancialImportBatch`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
