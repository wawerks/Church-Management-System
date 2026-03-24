"use server";

import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/action-log";
import { redirect } from "next/navigation";
import type { Role } from "@/generated/prisma/enums";

const ServiceIncomeSchema = z.object({
  serviceDate: z.string().min(1),
  amount: z.coerce.number().positive(),
});

export async function createServiceIncomeAction(formData: FormData) {
  await requireRole(["ADMIN", "STAFF", "TREASURER"] satisfies Role[]);

  const parsed = ServiceIncomeSchema.safeParse({
    serviceDate: (formData.get("serviceDate") ?? "") as string,
    amount: formData.get("amount"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const { serviceDate, amount } = parsed.data;
  const date = new Date(serviceDate);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid service date");
  }

  const entry = await prisma.serviceIncome.upsert({
    where: { serviceDate: date },
    update: { amount },
    create: { serviceDate: date, amount },
  });
  await logAction({
    action: "UPSERT",
    entity: "ServiceIncome",
    entityId: entry.id,
    details: { serviceDate: entry.serviceDate.toISOString(), amount: Number(entry.amount) },
  });

  redirect("/tithes-offering");
}

export async function deleteServiceIncomeAction(id: string) {
  await requireRole(["ADMIN", "STAFF", "TREASURER"] satisfies Role[]);
  const deleted = await prisma.serviceIncome.delete({
    where: { id },
    select: { id: true, serviceDate: true, amount: true },
  });
  await logAction({
    action: "DELETE",
    entity: "ServiceIncome",
    entityId: deleted.id,
    details: { serviceDate: deleted.serviceDate.toISOString(), amount: Number(deleted.amount) },
  });
  redirect("/tithes-offering");
}
