import { prisma } from "@/lib/prisma";
import type { VoidRequestEntity } from "@/generated/prisma/enums";

/** When an admin voids a row directly, close any open void requests for that target. */
export async function markPendingVoidRequestsSuperseded(
  entity: VoidRequestEntity,
  entityId: string,
  adminUserId: string,
) {
  await prisma.voidRequest.updateMany({
    where: { entity, entityId, status: "PENDING" },
    data: {
      status: "DECLINED",
      reviewedById: adminUserId,
      reviewedAt: new Date(),
      declineNote:
        "Closed: an administrator voided this record directly instead of using the queue.",
    },
  });
}
