import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

const BodySchema = z.object({
  eventId: z.string().min(1),
  records: z.record(z.string(), z.enum(["PRESENT", "ABSENT"])),
});

export async function POST(req: Request) {
  await requireRole(["ADMIN", "STAFF"]);

  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "Invalid input." },
      { status: 400 },
    );
  }

  const { eventId, records } = parsed.data;

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) {
    return NextResponse.json(
      { ok: false, message: "Event not found." },
      { status: 404 },
    );
  }

  // Replace the entire attendance set for this event date.
  await prisma.attendance.deleteMany({ where: { eventId } });

  const data = Object.entries(records).map(([memberId, status]) => ({
    memberId,
    eventId,
    date: event.date,
    status,
  }));

  if (data.length === 0) {
    return NextResponse.json({ ok: true });
  }

  await prisma.attendance.createMany({ data });

  return NextResponse.json({ ok: true });
}

