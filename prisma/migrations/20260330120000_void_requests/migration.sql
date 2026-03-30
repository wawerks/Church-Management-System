-- Void approval workflow (non-admin proposes; admin approves or declines)
CREATE TABLE `VoidRequest` (
  `id` VARCHAR(191) NOT NULL,
  `entity` ENUM('DONATION', 'SERVICE_INCOME', 'EXPENSE') NOT NULL,
  `entityId` VARCHAR(191) NOT NULL,
  `requestedById` VARCHAR(191) NOT NULL,
  `reason` VARCHAR(500) NOT NULL,
  `status` ENUM('PENDING', 'APPROVED', 'DECLINED') NOT NULL DEFAULT 'PENDING',
  `reviewedById` VARCHAR(191) NULL,
  `reviewedAt` DATETIME(3) NULL,
  `declineNote` VARCHAR(500) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `VoidRequest_status_idx` ON `VoidRequest`(`status`);
CREATE INDEX `VoidRequest_entity_entityId_idx` ON `VoidRequest`(`entity`, `entityId`);

ALTER TABLE `VoidRequest` ADD CONSTRAINT `VoidRequest_requestedById_fkey` FOREIGN KEY (`requestedById`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `VoidRequest` ADD CONSTRAINT `VoidRequest_reviewedById_fkey` FOREIGN KEY (`reviewedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
