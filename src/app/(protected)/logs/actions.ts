"use server";

import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import type { Role } from "@/generated/prisma/enums";

export async function deleteActionLogAction(logId: string) {
  await requireRole(["ADMIN"] satisfies Role[]);

  const id = logId?.trim();
  if (!id) {
    throw new Error("Invalid log");
  }

  await prisma.actionLog.delete({
    where: { id },
  });

  redirect("/logs");
}
