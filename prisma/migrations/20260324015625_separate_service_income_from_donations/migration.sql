/*
  Warnings:

  - The values [TITHE,OFFERING] on the enum `Donation_type` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterTable
ALTER TABLE `donation` MODIFY `type` ENUM('DONATION', 'OTHERS') NOT NULL;

-- CreateTable
CREATE TABLE `ServiceIncome` (
    `id` VARCHAR(191) NOT NULL,
    `serviceDate` DATETIME(3) NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ServiceIncome_serviceDate_key`(`serviceDate`),
    INDEX `ServiceIncome_serviceDate_idx`(`serviceDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
