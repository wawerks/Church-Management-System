-- CreateTable
CREATE TABLE `ActionLog` (
    `id` VARCHAR(191) NOT NULL,
    `actorId` VARCHAR(191) NULL,
    `actorName` VARCHAR(191) NOT NULL,
    `actorRole` ENUM('ADMIN', 'PASTOR', 'STAFF') NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `entity` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(191) NULL,
    `details` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ActionLog_createdAt_idx`(`createdAt`),
    INDEX `ActionLog_actorRole_createdAt_idx`(`actorRole`, `createdAt`),
    INDEX `ActionLog_entity_createdAt_idx`(`entity`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ActionLog` ADD CONSTRAINT `ActionLog_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
