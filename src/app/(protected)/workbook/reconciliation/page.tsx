import { requireRole } from "@/lib/auth";
import type { Role } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

function f(value: number) {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default async function WorkbookReconciliationPage() {
  await requireRole(["ADMIN"] satisfies Role[]);

  const periods = await prisma.financialPeriod.findMany({
    include: {
      remittanceLedger: true,
      activityLedgers: true,
    },
    orderBy: { monthKey: "desc" },
  });

  const rows = periods.map((period) => {
    const allocated = period.activityLedgers.reduce(
      (sum, row) => sum + Number(row.allocatedAmount),
      0,
    );
    const expense = period.activityLedgers.reduce(
      (sum, row) => sum + Number(row.expenseAmount),
      0,
    );
    const adjust = period.activityLedgers.reduce(
      (sum, row) => sum + Number(row.adjustmentAmount),
      0,
    );
    const expectedClosing = Number(period.openingBalance) + allocated + adjust - expense;
    const savedClosing = Number(period.closingBalance);
    const delta = Math.abs(expectedClosing - savedClosing);
    const ok = delta < 0.01;
    return {
      monthKey: period.monthKey,
      expectedClosing,
      savedClosing,
      delta,
      ok,
      remittance: Number(period.remittanceLedger?.totalRemittance ?? 0),
    };
  });

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h1 className="text-2xl font-semibold">Workbook Reconciliation</h1>
        <p className="mt-1 text-sm text-slate-600">
          Checks period totals against ledger rollups and flags drift.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-700">
              <tr>
                <th className="px-4 py-3 font-medium">Month</th>
                <th className="px-4 py-3 font-medium">Expected Closing</th>
                <th className="px-4 py-3 font-medium">Saved Closing</th>
                <th className="px-4 py-3 font-medium">Delta</th>
                <th className="px-4 py-3 font-medium">Remittance</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.monthKey} className="border-t border-slate-100">
                  <td className="px-4 py-3">{row.monthKey}</td>
                  <td className="px-4 py-3">{f(row.expectedClosing)}</td>
                  <td className="px-4 py-3">{f(row.savedClosing)}</td>
                  <td className="px-4 py-3">{f(row.delta)}</td>
                  <td className="px-4 py-3">{f(row.remittance)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        row.ok
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {row.ok ? "PASS" : "FAIL"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
