"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/action-log";
import type { Role } from "@/generated/prisma/enums";

const EventSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional().or(z.literal("")),
  date: z.string().min(1),
});

export async function createEventAction(formData: FormData) {
  await requireRole(["ADMIN"] satisfies Role[]);

  const parsed = EventSchema.safeParse({
    title: (formData.get("title") ?? "") as string,
    description: (formData.get("description") ?? "") as string,
    date: (formData.get("date") ?? "") as string,
  });

  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");

  const { title, description, date } = parsed.data;
  const eventDate = new Date(date);

  const event = await prisma.event.create({
    data: {
      title,
      description: description ? description : undefined,
      date: eventDate,
    },
  });
  await logAction({
    action: "CREATE",
    entity: "Event",
    entityId: event.id,
    details: { title: event.title, date: event.date.toISOString() },
  });

  redirect("/events");
}

export async function updateEventAction(eventId: string, formData: FormData) {
  await requireRole(["ADMIN"] satisfies Role[]);

  const parsed = EventSchema.safeParse({
    title: (formData.get("title") ?? "") as string,
    description: (formData.get("description") ?? "") as string,
    date: (formData.get("date") ?? "") as string,
  });

  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");

  const { title, description, date } = parsed.data;
  const eventDate = new Date(date);

  const event = await prisma.event.update({
    where: { id: eventId },
    data: {
      title,
      description: description ? description : undefined,
      date: eventDate,
    },
  });
  await logAction({
    action: "UPDATE",
    entity: "Event",
    entityId: event.id,
    details: { title: event.title, date: event.date.toISOString() },
  });

  redirect("/events");
}

export async function deleteEventAction(eventId: string) {
  await requireRole(["ADMIN"] satisfies Role[]);
  const deleted = await prisma.event.delete({
    where: { id: eventId },
    select: { id: true, title: true, date: true },
  });
  await logAction({
    action: "DELETE",
    entity: "Event",
    entityId: deleted.id,
    details: { title: deleted.title, date: deleted.date.toISOString() },
  });
  redirect("/events");
}

