import { requireRole, requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/generated/prisma/enums";
import { AttendanceReportExport } from "@/components/AttendanceReportExport";
import { canExportReports } from "@/lib/permissions";

export default async function AttendanceReportsPage() {
  await requireRole(["ADMIN", "PASTOR", "STAFF"] satisfies Role[]);
  const session = await requireSession();
  const canExport = canExportReports(session.role);

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
          {canExport
            ? "Export attendance averages per service date/event."
            : "View report options. Downloads are available to Admin and Staff only."}
        </p>
      </div>

      <AttendanceReportExport
        canExport={canExport}
        events={events.map((e) => ({ ...e, date: e.date }))}
      />
    </div>
  );
}

