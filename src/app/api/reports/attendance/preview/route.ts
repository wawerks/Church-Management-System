import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import type { Role } from "@/generated/prisma/enums";
import { AttendanceStatus as AttendanceStatusEnum } from "@/generated/prisma/enums";

function isAllowedRole(role: string): role is Role {
  return role === "ADMIN" || role === "PASTOR" || role === "STAFF";
}

function toInputDate(value: string | null) {
  if (!value) return null;
  const s = value.trim();
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export async function GET(req: Request) {
  const session = await getServerSession();
  if (!session || !isAllowedRole(session.role)) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  const params = new URL(req.url).searchParams;
  const from = toInputDate(params.get("from"));
  const to = toInputDate(params.get("to"));
  const eventId = params.get("eventId") ?? undefined;

  const today = new Date();
  const start = from
    ? startOfDay(from)
    : (() => {
        const d = new Date(today);
        d.setDate(d.getDate() - 30);
        return startOfDay(d);
      })();
  const end = to ? endOfDay(to) : endOfDay(today);

  try {
    const totalMembers = await prisma.member.count();

    const events = eventId
      ? await prisma.event.findMany({
          where: { id: eventId },
          select: { id: true, title: true, date: true },
        })
      : await prisma.event.findMany({
          where: { date: { gte: start, lte: end } },
          orderBy: { date: "desc" },
          select: { id: true, title: true, date: true },
        });

    const rows = await Promise.all(
      events.map(async (ev) => {
        const presentCount = await prisma.attendance.count({
          where: { eventId: ev.id, status: AttendanceStatusEnum.PRESENT },
        });
        const percent = totalMembers > 0 ? (presentCount / totalMembers) * 100 : 0;
        return {
          eventId: ev.id,
          title: ev.title,
          date: ev.date.toISOString(),
          presentCount,
          totalMembers,
          percent,
        };
      }),
    );

    const averagePercent =
      rows.length > 0
        ? rows.reduce((sum, x) => sum + x.percent, 0) / rows.length
        : 0;

    return NextResponse.json({
      ok: true,
      start: start.toISOString(),
      end: end.toISOString(),
      averagePercent,
      rows,
    });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Failed to load report preview." },
      { status: 500 },
    );
  }
}
