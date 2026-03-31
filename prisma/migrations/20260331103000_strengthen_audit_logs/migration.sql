-- AlterTable
ALTER TABLE `ActionLog`
  ADD COLUMN `userId` VARCHAR(191) NULL,
  ADD COLUMN `actionType` VARCHAR(191) NULL,
  ADD COLUMN `module` VARCHAR(191) NULL,
  ADD COLUMN `oldValue` JSON NULL,
  ADD COLUMN `newValue` JSON NULL,
  ADD COLUMN `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- CreateIndex
CREATE INDEX `ActionLog_timestamp_idx` ON `ActionLog`(`timestamp`);

-- CreateIndex
CREATE INDEX `ActionLog_userId_timestamp_idx` ON `ActionLog`(`userId`, `timestamp`);

-- CreateIndex
CREATE INDEX `ActionLog_module_timestamp_idx` ON `ActionLog`(`module`, `timestamp`);
