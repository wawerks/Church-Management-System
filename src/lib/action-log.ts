import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";

type LogActionParams = {
  action?: string;
  entity?: string;
  actionType?: string;
  module?: string;
  entityId?: string;
  oldValue?: Prisma.InputJsonValue;
  newValue?: Prisma.InputJsonValue;
  details?: Record<string, unknown>;
  actor?: {
    userId: string;
    name: string;
    role: Role;
  };
};

export async function logAction(params: LogActionParams) {
  const session = await getServerSession();
  const actor = params.actor ?? session;
  if (!actor) return;

  const actionType = params.actionType ?? params.action ?? "UNKNOWN";
  const moduleName = params.module ?? params.entity ?? "General";
  const oldValue = params.oldValue ?? undefined;
  const newValue =
    params.newValue ??
    (params.details
      ? (params.details as unknown as Prisma.InputJsonValue)
      : undefined);

  await prisma.actionLog.create({
    data: {
      userId: actor.userId,
      actionType,
      module: moduleName,
      oldValue,
      newValue,
      timestamp: new Date(),
      actorId: actor.userId,
      actorName: actor.name,
      actorRole: actor.role,
      action: actionType,
      entity: moduleName,
      entityId: params.entityId,
      details: newValue,
    },
  });
}
