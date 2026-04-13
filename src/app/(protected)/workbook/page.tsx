import Link from "next/link";
import { requireRole } from "@/lib/auth";
import type { Role } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import {
  bootstrapWorkbookAction,
  recomputeWorkbookAction,
  setWorkbookPeriodStatusAction,
  updateLedgerExpenseAction,
  upsertIncomeEntryAction,
} from "./actions";
import { ensureDefaultWorkbookSetup, ensureFinancialPeriod } from "@/lib/workbook-finance-store";

function monthOptions() {
  const now = new Date();
  const out: string[] = [];
  for (let i = -6; i <= 6; i += 1) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

export default async function WorkbookPage(props: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole(["ADMIN", "PASTOR", "STAFF", "TREASURER"] satisfies Role[]);

  const search = await props.searchParams;
  const selectedMonth =
    typeof search?.month === "string" && /^\d{4}-\d{2}$/.test(search.month)
      ? search.month
      : `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;

  await ensureDefaultWorkbookSetup();
  await ensureFinancialPeriod(selectedMonth);

  const period = await prisma.financialPeriod.findUnique({
    where: { monthKey: selectedMonth },
    include: {
      incomeEntries: { orderBy: { sortOrder: "asc" } },
      activityLedgers: {
        include: { activity: true },
        orderBy: [{ activity: { category: "asc" } }, { activity: { sortOrder: "asc" } }],
      },
      remittanceLedger: true,
    },
  });

  if (!period) {
    throw new Error("Unable to initialize period.");
  }

  const rowsById = new Map(period.activityLedgers.map((row) => [row.activityId, row]));
  const templates = await prisma.financialActivityTemplate.findMany({
    where: { isActive: true },
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
  });

  const categoryRows = templates.map((template) => ({
    template,
    row: rowsById.get(template.id),
  }));

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h1 className="text-2xl font-semibold">Workbook Planning</h1>
        <p className="mt-1 text-sm text-slate-600">
          Budget/ledger module aligned with the KFMC workbook flow.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <form className="flex flex-wrap items-end gap-3" action={bootstrapWorkbookAction}>
          <label className="block">
            <div className="mb-1 text-xs font-semibold uppercase text-slate-500">Period</div>
            <select
              name="monthKey"
              defaultValue={selectedMonth}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              {monthOptions().map((month) => (
                <option key={month} value={month}>
                  {month}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Load Period
          </button>
        </form>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs uppercase text-slate-500">Opening Balance</div>
          <div className="mt-1 text-xl font-semibold">{Number(period.openingBalance).toFixed(2)}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs uppercase text-slate-500">Monthly Income</div>
          <div className="mt-1 text-xl font-semibold">{Number(period.monthlyIncome).toFixed(2)}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs uppercase text-slate-500">Actual Expenses</div>
          <div className="mt-1 text-xl font-semibold">{Number(period.actualExpenses).toFixed(2)}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs uppercase text-slate-500">Closing Balance</div>
          <div className="mt-1 text-xl font-semibold">{Number(period.closingBalance).toFixed(2)}</div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-2">
          <form action={recomputeWorkbookAction}>
            <input type="hidden" name="monthKey" value={selectedMonth} />
            <button
              type="submit"
              className="rounded-md bg-black px-3 py-2 text-sm font-medium text-white hover:bg-black/90"
            >
              Recompute
            </button>
          </form>
          <form action={setWorkbookPeriodStatusAction}>
            <input type="hidden" name="monthKey" value={selectedMonth} />
            <input type="hidden" name="status" value="LOCKED" />
            <button
              type="submit"
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Lock
            </button>
          </form>
          <form action={setWorkbookPeriodStatusAction}>
            <input type="hidden" name="monthKey" value={selectedMonth} />
            <input type="hidden" name="status" value="FINALIZED" />
            <button
              type="submit"
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Finalize
            </button>
          </form>
          <span className="ml-auto rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            {period.status}
          </span>
          <Link
            href="/workbook/reconciliation"
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Reconciliation
          </Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-base font-semibold">Weekly Income Entries</h2>
          <div className="mt-3 space-y-2">
            {period.incomeEntries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm">
                <span>{entry.label}</span>
                <span>{Number(entry.amount).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <form action={upsertIncomeEntryAction} className="mt-4 grid gap-2 sm:grid-cols-2">
            <input type="hidden" name="monthKey" value={selectedMonth} />
            <input name="label" placeholder="Label (e.g. 1st week)" className="rounded-md border border-slate-300 px-3 py-2 text-sm" required />
            <input name="amount" type="number" step="0.01" placeholder="Amount" className="rounded-md border border-slate-300 px-3 py-2 text-sm" required />
            <input name="sortOrder" type="number" min={0} max={99} placeholder="Sort order" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
            <select name="kind" className="rounded-md border border-slate-300 px-3 py-2 text-sm">
              <option value="WEEKLY">Weekly</option>
              <option value="OPENING">Opening</option>
              <option value="ADJUSTMENT">Adjustment</option>
            </select>
            <button type="submit" className="rounded-md bg-black px-3 py-2 text-sm font-medium text-white hover:bg-black/90 sm:col-span-2">
              Save Income Entry
            </button>
          </form>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-base font-semibold">Remittance Ledger</h2>
          {period.remittanceLedger ? (
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-md border border-slate-200 p-2">Conference: {Number(period.remittanceLedger.conferenceAmount).toFixed(2)}</div>
              <div className="rounded-md border border-slate-200 p-2">Mission: {Number(period.remittanceLedger.missionAmount).toFixed(2)}</div>
              <div className="rounded-md border border-slate-200 p-2">ARM: {Number(period.remittanceLedger.armAmount).toFixed(2)}</div>
              <div className="rounded-md border border-slate-200 p-2">LLBC: {Number(period.remittanceLedger.llbcAmount).toFixed(2)}</div>
              <div className="rounded-md border border-slate-200 p-2 col-span-2 font-semibold">
                Total: {Number(period.remittanceLedger.totalRemittance).toFixed(2)}
              </div>
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-500">No remittance data yet.</p>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-base font-semibold">Activity Ledger</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="px-3 py-2">Activity</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">%</th>
                <th className="px-3 py-2">Carry-in</th>
                <th className="px-3 py-2">Allocated</th>
                <th className="px-3 py-2">Expense</th>
                <th className="px-3 py-2">Adjustment</th>
                <th className="px-3 py-2">Ending</th>
              </tr>
            </thead>
            <tbody>
              {categoryRows.map(({ template, row }) => (
                <tr key={template.id} className="border-t border-slate-100">
                  <td className="px-3 py-2">{template.name}</td>
                  <td className="px-3 py-2">{template.category}</td>
                  <td className="px-3 py-2">{(Number(template.standardPct) * 100).toFixed(2)}</td>
                  <td className="px-3 py-2">{Number(row?.carryOverIn ?? 0).toFixed(2)}</td>
                  <td className="px-3 py-2">{Number(row?.allocatedAmount ?? 0).toFixed(2)}</td>
                  <td className="px-3 py-2">{Number(row?.expenseAmount ?? 0).toFixed(2)}</td>
                  <td className="px-3 py-2">{Number(row?.adjustmentAmount ?? 0).toFixed(2)}</td>
                  <td className="px-3 py-2 font-semibold">{Number(row?.endingBalance ?? 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-base font-semibold">Quick Expense/Adjustment Update</h2>
        <form action={updateLedgerExpenseAction} className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <input type="hidden" name="monthKey" value={selectedMonth} />
          <select name="activityId" className="rounded-md border border-slate-300 px-3 py-2 text-sm lg:col-span-2" required>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.category} - {t.name}
              </option>
            ))}
          </select>
          <input name="expenseAmount" type="number" step="0.01" min={0} placeholder="Expense amount" className="rounded-md border border-slate-300 px-3 py-2 text-sm" required />
          <input name="adjustmentAmount" type="number" step="0.01" placeholder="Adjustment (+/-)" className="rounded-md border border-slate-300 px-3 py-2 text-sm" defaultValue={0} />
          <input name="remarks" placeholder="Remarks (optional)" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <button type="submit" className="rounded-md bg-black px-3 py-2 text-sm font-medium text-white hover:bg-black/90 lg:col-span-5">
            Save Ledger Update
          </button>
        </form>
      </div>
    </div>
  );
}
