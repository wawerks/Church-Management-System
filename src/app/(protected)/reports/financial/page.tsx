import { requireRole, requireSession } from "@/lib/auth";
import type { Role } from "@/generated/prisma/enums";
import { FinancialReportExport } from "@/components/FinancialReportExport";
import { canExportFinancialReports } from "@/lib/permissions";

export default async function FinancialReportsPage() {
  await requireRole(["ADMIN", "PASTOR", "STAFF", "TREASURER"] satisfies Role[]);
  const session = await requireSession();
  const canExport = canExportFinancialReports(session.role);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Financial Reports</h1>
        <p className="mt-1 text-sm text-slate-600">
          {canExport
            ? "Export totals for Tithes & Offering and Donations in Excel, PDF, or Word."
            : "View report options. Downloads are available to Admin, Staff, and Treasurer only."}
        </p>
      </div>

      <FinancialReportExport canExport={canExport} />
    </div>
  );
}

