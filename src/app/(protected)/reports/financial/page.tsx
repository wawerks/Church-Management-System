import { requireRole } from "@/lib/auth";
import type { Role } from "@/generated/prisma/enums";
import { FinancialReportExport } from "@/components/FinancialReportExport";

export default async function FinancialReportsPage() {
  await requireRole(["ADMIN", "PASTOR"] satisfies Role[]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Financial Reports</h1>
        <p className="mt-1 text-sm text-slate-600">
          Export donations totals in Excel, PDF, or Word.
        </p>
      </div>

      <FinancialReportExport />
    </div>
  );
}

