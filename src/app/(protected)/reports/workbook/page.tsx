import { requireRole } from "@/lib/auth";
import type { Role } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

function money(value: number) {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default async function WorkbookReportsPage() {
  await requireRole(["ADMIN", "PASTOR", "STAFF", "TREASURER"] satisfies Role[]);

  const rows = await prisma.financialConferenceMonthly.findMany({
    orderBy: { monthKey: "desc" },
    take: 24,
  });

  const totals = rows.reduce(
    (acc, row) => {
      acc.income += Number(row.income);
      acc.expenses += Number(row.actualExpenses);
      acc.remit += Number(row.actualRemittance);
      acc.net += Number(row.netBalance);
      return acc;
    },
    { income: 0, expenses: 0, remit: 0, net: 0 },
  );

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h1 className="text-2xl font-semibold">Workbook Conference Report</h1>
        <p className="mt-1 text-sm text-slate-600">
          Monthly consolidated view aligned with the KFMC workbook conference sheet.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs uppercase text-slate-500">Total Income</div>
          <div className="mt-1 text-xl font-semibold">{money(totals.income)}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs uppercase text-slate-500">Total Expenses</div>
          <div className="mt-1 text-xl font-semibold">{money(totals.expenses)}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs uppercase text-slate-500">Total Remittance</div>
          <div className="mt-1 text-xl font-semibold">{money(totals.remit)}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs uppercase text-slate-500">Net Balance</div>
          <div className="mt-1 text-xl font-semibold">{money(totals.net)}</div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-700">
              <tr>
                <th className="px-4 py-3 font-medium">Month</th>
                <th className="px-4 py-3 font-medium">Income</th>
                <th className="px-4 py-3 font-medium">Actual Expenses</th>
                <th className="px-4 py-3 font-medium">Conference</th>
                <th className="px-4 py-3 font-medium">Mission</th>
                <th className="px-4 py-3 font-medium">ARM</th>
                <th className="px-4 py-3 font-medium">LLBC</th>
                <th className="px-4 py-3 font-medium">Remittance</th>
                <th className="px-4 py-3 font-medium">Net</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-6 text-center text-slate-500">
                    No workbook summary rows yet.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">{row.monthKey}</td>
                    <td className="px-4 py-3">{money(Number(row.income))}</td>
                    <td className="px-4 py-3">{money(Number(row.actualExpenses))}</td>
                    <td className="px-4 py-3">{money(Number(row.conferenceAmount))}</td>
                    <td className="px-4 py-3">{money(Number(row.missionAmount))}</td>
                    <td className="px-4 py-3">{money(Number(row.armAmount))}</td>
                    <td className="px-4 py-3">{money(Number(row.llbcAmount))}</td>
                    <td className="px-4 py-3 font-semibold">{money(Number(row.actualRemittance))}</td>
                    <td className="px-4 py-3 font-semibold">{money(Number(row.netBalance))}</td>
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
