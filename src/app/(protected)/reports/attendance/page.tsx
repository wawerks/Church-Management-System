import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/generated/prisma/enums";
import { AttendanceReportExport } from "@/components/AttendanceReportExport";

export default async function AttendanceReportsPage() {
  await requireRole(["ADMIN", "PASTOR"] satisfies Role[]);

  let events: Array<{ id: string; title: string; date: Date }> = [];
  try {
    events = await prisma.event.findMany({
      orderBy: { date: "desc" },
      take: 30,
      select: { id: true, title: true, date: true },
    });
  } catch {
    // ignore
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Attendance Reports</h1>
        <p className="mt-1 text-sm text-slate-600">
          Export attendance averages per service date/event.
        </p>
      </div>

      <AttendanceReportExport
        events={events.map((e) => ({ ...e, date: e.date }))}
      />
    </div>
  );
}

