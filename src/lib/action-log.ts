import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type LogActionParams = {
  action: string;
  entity: string;
  entityId?: string;
  details?: Record<string, unknown>;
};

export async function logAction(params: LogActionParams) {
  const session = await getServerSession();
  if (!session) return;

  await prisma.actionLog.create({
    data: {
      actorId: session.userId,
      actorName: session.name || session.email,
      actorRole: session.role,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId,
      details: params.details,
    },
  });
}
