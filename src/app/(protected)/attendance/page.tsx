import { requireRole, requireSession } from "@/lib/auth";
import { canMarkAttendance } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/generated/prisma/enums";
import { AttendanceStatus } from "@/generated/prisma/enums";
import { AttendanceMarkForm } from "@/components/AttendanceMarkForm";
import Link from "next/link";

type Status = "PRESENT" | "ABSENT";

function toMap<T extends string>(arr: Array<{ memberId: string; status: T }>) {
  const out: Record<string, T> = {};
  for (const x of arr) out[x.memberId] = x.status;
  return out;
}

export default async function AttendancePage(props: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole(["ADMIN", "PASTOR", "STAFF", "TREASURER"] satisfies Role[]);
  const session = await requireSession();
  const canMark = canMarkAttendance(session.role);

  const searchParams = await props.searchParams;
  const eventIdRaw = searchParams?.eventId;
  const eventId =
    typeof eventIdRaw === "string"
      ? eventIdRaw
      : Array.isArray(eventIdRaw)
        ? eventIdRaw[0]
        : undefined;

  let dbReady = true;
  let events: Array<{ id: string; title: string; date: Date }> = [];
  let members: Array<{ id: string; firstName: string; lastName: string }> = [];
  let attendanceMap: Record<string, Status> = {};
  let averagePercent = 0;
  let history: Array<{
    eventId: string;
    title: string;
    date: Date;
    presentCount: number;
    totalMembers: number;
    percent: number;
  }> = [];

  try {
    const [eventList, memberList, totalMembers] = await Promise.all([
      prisma.event.findMany({
        orderBy: { date: "desc" },
        take: 10,
        select: { id: true, title: true, date: true },
      }),
      prisma.member.findMany({
        orderBy: { lastName: "asc" },
        select: { id: true, firstName: true, lastName: true },
      }),
      prisma.member.count(),
    ]);

    events = eventList;
    members = memberList;

    const selected = eventId
      ? eventList.find((e) => e.id === eventId) ?? null
      : eventList[0] ?? null;

    if (selected) {
      const attendance = await prisma.attendance.findMany({
        where: { eventId: selected.id },
        select: { memberId: true, status: true },
      });

      attendanceMap = toMap(attendance);
      const presentCount = attendance.filter(
        (a) => a.status === AttendanceStatus.PRESENT,
      ).length;
      averagePercent =
        totalMembers > 0 ? (presentCount / totalMembers) * 100 : 0;
    }

    const historyEvents = await prisma.event.findMany({
      orderBy: { date: "desc" },
      take: 6,
      select: { id: true, title: true, date: true },
    });

    const historyCounts = await Promise.all(
      historyEvents.map(async (ev) => {
        const presentCount = await prisma.attendance.count({
          where: { eventId: ev.id, status: AttendanceStatus.PRESENT },
        });
        const percent = totalMembers > 0 ? (presentCount / totalMembers) * 100 : 0;
        return {
          eventId: ev.id,
          title: ev.title,
          date: ev.date,
          presentCount,
          totalMembers,
          percent,
        };
      }),
    );

    history = historyCounts;
  } catch {
    dbReady = false;
  }

  const selectedId = eventId ?? events[0]?.id ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Attendance</h1>
          <p className="mt-1 text-sm text-slate-600">
            {canMark
              ? "Mark presence per service/event."
              : "Review attendance (view only)."}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-right">
          <div className="text-sm font-medium text-slate-600">
            Attendance Average
          </div>
          <div className="mt-1 text-2xl font-semibold">
            {dbReady ? `${averagePercent.toFixed(1)}%` : "—"}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Based on selected event.
          </div>
        </div>
      </div>

      {!dbReady ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Database isn’t ready yet. Set up MySQL + run Prisma migrations.
        </div>
      ) : null}
      {dbReady && events.length === 0 ? (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          No service dates found yet. Create one in{" "}
          <Link href="/events" className="underline hover:no-underline">
            Events
          </Link>{" "}
          so you can select it here for attendance.
        </div>
      ) : null}

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <AttendanceMarkForm
          events={events}
          selectedEventId={selectedId}
          members={members}
          initialStatuses={attendanceMap}
          readOnly={!canMark}
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 text-sm font-semibold text-slate-800">
          Attendance History
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-slate-700">
                <th className="px-4 py-3 font-medium">Service</th>
                <th className="px-4 py-3 font-medium">Present</th>
                <th className="px-4 py-3 font-medium">Average</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-slate-500">
                    No attendance records yet.
                  </td>
                </tr>
              ) : (
                history.map((h) => (
                  <tr key={h.eventId} className="border-t border-slate-100">
                    <td className="px-4 py-3">
                      <div className="font-medium">{h.title}</div>
                      <div className="text-xs text-slate-500">
                        {h.date.toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {h.presentCount} / {h.totalMembers}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {h.percent.toFixed(1)}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

