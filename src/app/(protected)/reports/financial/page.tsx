import { requireRole, requireSession } from "@/lib/auth";
import type { Role } from "@/generated/prisma/enums";
import { FinancialReportExport } from "@/components/FinancialReportExport";
import { canExportFinancialReports } from "@/lib/permissions";
import Link from "next/link";

export default async function FinancialReportsPage() {
  await requireRole(["ADMIN", "PASTOR", "STAFF", "TREASURER"] satisfies Role[]);
  const session = await requireSession();
  const canExport = canExportFinancialReports(session.role);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h1 className="text-2xl font-semibold">Financial Reports</h1>
        <p className="mt-1 text-sm text-slate-600">
          {canExport
            ? "Export financial data including Tithes & Offering, Donations, expense totals, and expenses by type in Excel, PDF, or Word."
            : "View report options. Downloads are available to Admin, Staff, and Treasurer only."}
        </p>
      </div>

      <FinancialReportExport canExport={canExport} />
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-base font-semibold text-slate-900">Workbook Conference View</h2>
        <p className="mt-1 text-sm text-slate-600">
          Open the workbook-aligned monthly conference rollup generated from period calculations.
        </p>
        <Link
          href="/reports/workbook"
          className="mt-3 inline-flex rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Open Workbook Report
        </Link>
      </div>
    </div>
  );
}

