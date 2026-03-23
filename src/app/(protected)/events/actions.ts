"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/generated/prisma/enums";

const EventSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional().or(z.literal("")),
  date: z.string().min(1),
});

export async function createEventAction(formData: FormData) {
  await requireRole(["ADMIN", "PASTOR"] satisfies Role[]);

  const parsed = EventSchema.safeParse({
    title: (formData.get("title") ?? "") as string,
    description: (formData.get("description") ?? "") as string,
    date: (formData.get("date") ?? "") as string,
  });

  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");

  const { title, description, date } = parsed.data;
  const eventDate = new Date(date);

  await prisma.event.create({
    data: {
      title,
      description: description ? description : undefined,
      date: eventDate,
    },
  });

  redirect("/events");
}

export async function updateEventAction(eventId: string, formData: FormData) {
  await requireRole(["ADMIN", "PASTOR"] satisfies Role[]);

  const parsed = EventSchema.safeParse({
    title: (formData.get("title") ?? "") as string,
    description: (formData.get("description") ?? "") as string,
    date: (formData.get("date") ?? "") as string,
  });

  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");

  const { title, description, date } = parsed.data;
  const eventDate = new Date(date);

  await prisma.event.update({
    where: { id: eventId },
    data: {
      title,
      description: description ? description : undefined,
      date: eventDate,
    },
  });

  redirect("/events");
}

export async function deleteEventAction(eventId: string) {
  await requireRole(["ADMIN", "PASTOR"] satisfies Role[]);
  await prisma.event.delete({ where: { id: eventId } });
  redirect("/events");
}

