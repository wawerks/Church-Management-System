import Link from "next/link";
import { requireRole, requireSession } from "@/lib/auth";
import { canMutateDonations } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type { Role } from "@/generated/prisma/enums";
import { DeleteSubmitButton } from "@/components/form-buttons";
import { requestVoidExpenseAction } from "./actions";
import { AddExpenseModal } from "@/components/AddExpenseModal";
import { ExpensesFilters } from "@/components/ExpensesFilters";
import { ExpenseHighlightScroller } from "@/components/ExpenseHighlightScroller";

export const dynamic = "force-dynamic";

function parseDateInput(value: unknown): Date | null {
  if (typeof value !== "string") return null;
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

function formatMoney(value: number) {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function toMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function parseMonthKey(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}$/.test(trimmed)) return null;
  const year = Number(trimmed.slice(0, 4));
  const month = Number(trimmed.slice(5, 7));
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return null;
  }
  return trimmed;
}

function monthRange(monthKey: string) {
  const year = Number(monthKey.slice(0, 4));
  const monthIndex = Number(monthKey.slice(5, 7)) - 1;
  const start = new Date(year, monthIndex, 1, 0, 0, 0, 0);
  const end = new Date(year, monthIndex + 1, 1, 0, 0, 0, 0);
  return { start, end };
}

export default async function ExpensesPage(props: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole(["ADMIN", "PASTOR", "STAFF", "TREASURER"] satisfies Role[]);
  const session = await requireSession();
  const canEdit = canMutateDonations(session.role);
  const searchParams = await props.searchParams;
  const isAdmin = session.role === "ADMIN";
  const currentMonthKey = toMonthKey(new Date());

  let expenseTypes: Array<{
    id: string;
    name: string;
    allocationPercent: number;
    isAllocatedFromServiceIncome: boolean;
  }> = [];
  let serviceIncomeTotalsByMonth: Record<string, number> = {};
  let monthOptions: string[] = [currentMonthKey];
  try {
    const [types, serviceIncomes, allocatedExpenseMonths] = await Promise.all([
      prisma.expenseType.findMany({ orderBy: { name: "asc" } }),
      prisma.serviceIncome.findMany({
        where: { isDeleted: false },
        select: { serviceDate: true, amount: true },
        orderBy: { serviceDate: "desc" },
      }),
      prisma.expense.findMany({
        where: { isDeleted: false, allocationPercentUsed: { not: null } },
        select: { date: true },
        orderBy: { date: "desc" },
      }),
    ]);
    expenseTypes = types.map((t) => ({
      id: t.id,
      name: t.name,
      allocationPercent: Number(t.allocationPercent),
      isAllocatedFromServiceIncome: t.isAllocatedFromServiceIncome,
    }));
    const totals: Record<string, number> = {};
    for (const row of serviceIncomes) {
      const key = `${row.serviceDate.getFullYear()}-${String(
        row.serviceDate.getMonth() + 1,
      ).padStart(2, "0")}`;
      totals[key] = (totals[key] ?? 0) + Number(row.amount);
    }
    serviceIncomeTotalsByMonth = totals;
    const monthSet = new Set<string>([currentMonthKey]);
    for (const row of serviceIncomes) monthSet.add(toMonthKey(row.serviceDate));
    for (const row of allocatedExpenseMonths) monthSet.add(toMonthKey(row.date));
    monthOptions = Array.from(monthSet).sort((a, b) => b.localeCompare(a));
  } catch {
    // ignore
  }
  const expenseTypeNames = expenseTypes.map((t) => t.name);
  const totalEnabledAllocationPercent = expenseTypes
    .filter((t) => t.isAllocatedFromServiceIncome)
    .reduce((sum, t) => sum + t.allocationPercent, 0);
  const isAllocationPercentValid = Math.abs(totalEnabledAllocationPercent - 100) < 0.0001;

  // Suggestions for the "Received By" picker in the add-expense modal.
  let receivedBySuggestions: string[] = [];
  try {
    const [expenseRows, memberRows] = await Promise.all([
      prisma.expense.findMany({
        where: { isDeleted: false },
        select: { receivedBy: true },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
      prisma.member.findMany({
        select: { firstName: true, lastName: true },
        orderBy: { lastName: "asc" },
        take: 200,
      }),
    ]);

    const names = new Set<string>();
    for (const e of expenseRows) {
      const n = e.receivedBy.trim();
      if (n.length > 0) names.add(n);
    }
    for (const m of memberRows) {
      const full = `${m.firstName} ${m.lastName}`.trim();
      if (full.length > 0) names.add(full);
    }
    receivedBySuggestions = Array.from(names).sort((a, b) =>
      a.localeCompare(b),
    );
  } catch {
    // ignore
  }

  const typeRaw = searchParams?.type;
  const type =
    typeof typeRaw === "string" && expenseTypeNames.includes(typeRaw)
      ? typeRaw
      : undefined;

  const highlightExpenseId =
    typeof searchParams?.highlight === "string" && searchParams.highlight.trim().length > 0
      ? searchParams.highlight.trim()
      : undefined;

  const viewRaw = searchParams?.view;
  const view = highlightExpenseId
    ? "expenses"
    : typeof viewRaw === "string" && ["summary", "balance", "expenses"].includes(viewRaw)
      ? viewRaw
      : "summary";

  const from = parseDateInput(searchParams?.from);
  const to = parseDateInput(searchParams?.to);
  let budgetMonth = parseMonthKey(searchParams?.budgetMonth) ?? currentMonthKey;
  if (highlightExpenseId) {
    try {
      const hi = await prisma.expense.findFirst({
        where: { id: highlightExpenseId, isDeleted: false },
        select: { date: true },
      });
      if (hi) budgetMonth = toMonthKey(hi.date);
    } catch {
      // ignore
    }
  }
  const { start: budgetMonthStart, end: budgetMonthEnd } = monthRange(budgetMonth);

  // Always constrain the table + totals to the selected budget month.
  // If "From/To" are provided, we further narrow inside that budget month.
  const budgetDateFilter: Prisma.ExpenseWhereInput["date"] = {
    gte: budgetMonthStart,
    lt: budgetMonthEnd,
  };
  if (from) {
    const fromGte = startOfDay(from);
    if (fromGte.getTime() > budgetMonthStart.getTime()) {
      budgetDateFilter.gte = fromGte;
    }
  }
  if (to) {
    const toExclusive = new Date(endOfDay(to).getTime() + 1);
    if (toExclusive.getTime() < budgetMonthEnd.getTime()) {
      budgetDateFilter.lt = toExclusive;
    }
  }

  const where: Prisma.ExpenseWhereInput = {
    isDeleted: false,
    ...(type ? { type } : {}),
    date: budgetDateFilter,
  };

  let dbReady = true;
  let dbErrorMessage: string | null = null;
  let rows: Array<{
    id: string;
    type: string;
    claimedBy: string;
    receivedBy: string;
    date: Date;
    amount: string;
  }> = [];
  let total = 0;
  let selectedMonthServiceIncomeTotal = 0;
  let selectedMonthAllocatedBudget = 0;
  let selectedMonthAllocatedExpenses = 0;
  let carryOverBeforeSelectedMonth = 0;
  let selectedMonthRemainingBudget = 0;
  let summaryRows: Array<{
    month: string;
    income: number;
    expenses: number;
    remaining: number;
  }> = [];
  let summaryTotalMonthlyRemaining = 0;
  let allocationShares: Array<{
    id: string;
    name: string;
    allocationPercent: number;
    amount: number;
  }> = [];
  let spentByTypeForBudgetMonth: Record<string, number> = {};

  try {
    const spentWhere = {
      isDeleted: false,
      date: {
        gte: budgetMonthStart,
        lt: budgetMonthEnd,
      },
    };

    const expenseListTake = highlightExpenseId ? 1000 : 100;

    const [
      list,
      agg,
      monthIncomeAgg,
      monthAllocatedExpenseAgg,
      prevIncomeAgg,
      prevAllocatedExpenseAgg,
      monthExpensesByType,
      allExpensesForSummary,
    ] = await Promise.all([
      prisma.expense.findMany({
        where,
        orderBy: { date: "desc" },
        take: expenseListTake,
      }),
      prisma.expense.aggregate({
        _sum: { amount: true },
        where,
      }),
      prisma.serviceIncome.aggregate({
        _sum: { amount: true },
        where: {
          isDeleted: false,
          serviceDate: {
            gte: budgetMonthStart,
            lt: budgetMonthEnd,
          },
        },
      }),
      prisma.expense.aggregate({
        _sum: { amount: true },
        where: {
          isDeleted: false,
          date: {
            gte: budgetMonthStart,
            lt: budgetMonthEnd,
          },
          allocationPercentUsed: { not: null },
        },
      }),
      prisma.serviceIncome.aggregate({
        _sum: { amount: true },
        where: {
          isDeleted: false,
          serviceDate: {
            lt: budgetMonthStart,
          },
        },
      }),
      prisma.expense.aggregate({
        _sum: { amount: true },
        where: {
          isDeleted: false,
          date: {
            lt: budgetMonthStart,
          },
          allocationPercentUsed: { not: null },
        },
      }),
      prisma.expense.findMany({
        where: spentWhere,
        select: { type: true, amount: true },
      }),
      prisma.expense.findMany({
        where: { isDeleted: false },
        select: { date: true, amount: true },
        orderBy: { date: "desc" },
      }),
    ]);

    rows = list.map((r) => ({
      id: r.id,
      type: r.type,
      claimedBy: r.claimedBy,
      receivedBy: r.receivedBy,
      date: r.date,
      amount: r.amount.toString(),
    }));
    total = Number(agg._sum.amount ?? 0);
    selectedMonthServiceIncomeTotal = Number(monthIncomeAgg._sum.amount ?? 0);
    selectedMonthAllocatedBudget =
      (selectedMonthServiceIncomeTotal * totalEnabledAllocationPercent) / 100;
    selectedMonthAllocatedExpenses = Number(monthAllocatedExpenseAgg._sum.amount ?? 0);
    const previousIncomeTotal = Number(prevIncomeAgg._sum.amount ?? 0);
    const previousAllocatedBudget = (previousIncomeTotal * totalEnabledAllocationPercent) / 100;
    const previousAllocatedExpenses = Number(prevAllocatedExpenseAgg._sum.amount ?? 0);
    carryOverBeforeSelectedMonth = previousAllocatedBudget - previousAllocatedExpenses;
    selectedMonthRemainingBudget =
      carryOverBeforeSelectedMonth +
      selectedMonthAllocatedBudget -
      selectedMonthAllocatedExpenses;

    const expenseByMonth = new Map<string, number>();
    for (const row of allExpensesForSummary) {
      const key = toMonthKey(row.date);
      expenseByMonth.set(key, (expenseByMonth.get(key) ?? 0) + Number(row.amount));
    }

    const months = new Set<string>([
      ...Object.keys(serviceIncomeTotalsByMonth),
      ...Array.from(expenseByMonth.keys()),
    ]);

    summaryRows = Array.from(months)
      .sort((a, b) => b.localeCompare(a))
      .map((month) => {
        const income = serviceIncomeTotalsByMonth[month] ?? 0;
        const expenses = expenseByMonth.get(month) ?? 0;
        const remaining = income - expenses;
        return { month, income, expenses, remaining };
      });

    summaryTotalMonthlyRemaining = summaryRows.reduce((sum, row) => sum + row.remaining, 0);

    const spentByType = new Map<string, number>();
    for (const e of monthExpensesByType) {
      const prev = spentByType.get(e.type) ?? 0;
      spentByType.set(e.type, prev + Number(e.amount));
    }

    spentByTypeForBudgetMonth = Object.fromEntries(spentByType.entries());

    allocationShares = expenseTypes
      .filter((t) => t.isAllocatedFromServiceIncome)
      .map((t) => {
        const computedShare = (selectedMonthServiceIncomeTotal * t.allocationPercent) / 100;
        const spentShare = spentByType.get(t.name) ?? 0;
        return {
          id: t.id,
          name: t.name,
          allocationPercent: t.allocationPercent,
          // Remaining share after subtracting already-created expenses this budget month.
          amount: Number((computedShare - spentShare).toFixed(2)),
        };
      });
  } catch (error) {
    dbReady = false;
    dbErrorMessage = error instanceof Error ? error.message : "Unknown database error";
  }

  let pendingVoidExpenseIds = new Set<string>();
  if (dbReady && canEdit && rows.length > 0) {
    try {
      const pend = await prisma.voidRequest.findMany({
        where: {
          entity: "EXPENSE",
          status: "PENDING",
          entityId: { in: rows.map((r) => r.id) },
        },
        select: { entityId: true },
      });
      pendingVoidExpenseIds = new Set(pend.map((p) => p.entityId));
    } catch {
      // ignore
    }
  }

  const totalByType = Object.values(
    rows.reduce((acc, r) => {
      const prev = acc[r.type] ?? 0;
      acc[r.type] = prev + Number(r.amount);
      return acc;
    }, {} as Record<string, number>),
  ).reduce((entries, _v) => entries, [] as number[]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Expenses</h1>
          <p className="mt-1 text-sm text-slate-600">
            Track church expenses and review all expense transactions.
          </p>
        </div>
        {canEdit ? (
          <div className="flex gap-2">
            {isAdmin ? (
              <Link
                href="/expenses/types"
                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Manage Expense Types
              </Link>
            ) : null}
            <AddExpenseModal
              expenseTypes={expenseTypes}
              receivedBySuggestions={receivedBySuggestions}
              serviceIncomeTotalsByMonth={serviceIncomeTotalsByMonth}
              budgetMonth={budgetMonth}
              spentByTypeForBudgetMonth={spentByTypeForBudgetMonth}
            />
          </div>
        ) : null}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-2">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["balance", "Monthly Allocation Balance"],
              ["expenses", "Expenses"],
              ["summary", "Summary"],
            ] as const
          ).map(([key, label]) => {
            const params = new URLSearchParams();
            if (key !== "summary" && type) params.set("type", type);
            if (key !== "summary") params.set("budgetMonth", budgetMonth);
            params.set("view", key);
            if (highlightExpenseId) params.set("highlight", highlightExpenseId);
            return (
              <Link
                key={key}
                href={`/expenses?${params.toString()}`}
                className={`rounded-md px-3 py-2 text-sm font-medium ${
                  view === key
                    ? "bg-black text-white"
                    : "bg-white text-slate-700 hover:bg-slate-50"
                }`}
                aria-current={view === key ? "page" : undefined}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </div>

      {view !== "summary" ? (
        <ExpensesFilters
          expenseTypes={expenseTypes}
          type={type}
          budgetMonth={budgetMonth}
          monthOptions={monthOptions}
          view={view}
          highlight={highlightExpenseId}
        />
      ) : null}

      {!dbReady ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Database error while loading expenses.
          {dbErrorMessage ? <div className="mt-1">Details: {dbErrorMessage}</div> : null}
        </div>
      ) : null}

      {view === "summary" ? (
        <div className="space-y-4 w-full">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-sm font-medium text-slate-600">
              Total Monthly Remaining Amount
            </div>
            <div
              className={`mt-2 text-3xl font-semibold ${
                summaryTotalMonthlyRemaining >= 0 ? "text-emerald-700" : "text-rose-700"
              }`}
            >
              {dbReady ? formatMoney(summaryTotalMonthlyRemaining) : "-"}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="overflow-x-auto px-3">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-left text-slate-700">
                    <th className="px-4 py-3 font-medium">Month</th>
                    <th className="px-4 py-3 font-medium">Monthly Income</th>
                    <th className="px-4 py-3 font-medium">Monthly Expenses</th>
                    <th className="px-4 py-3 font-medium">Remaining Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {dbReady && summaryRows.length > 0 ? (
                    summaryRows.map((row) => (
                      <tr key={row.month} className="border-t border-slate-100">
                        <td className="px-4 py-3">{row.month}</td>
                        <td className="px-4 py-3">{formatMoney(row.income)}</td>
                        <td className="px-4 py-3">{formatMoney(row.expenses)}</td>
                        <td
                          className={`px-4 py-3 font-semibold ${
                            row.remaining >= 0 ? "text-emerald-700" : "text-rose-700"
                          }`}
                        >
                          {formatMoney(row.remaining)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                        No monthly summary data found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {view === "balance" ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 w-full">
          <div className="text-sm font-medium text-slate-600">
            Monthly Allocation Balance ({budgetMonth})
          </div>
          <div className="mt-2 text-sm text-slate-600">
            Budget from service income ({totalEnabledAllocationPercent.toFixed(2)}%)
          </div>
          {!isAllocationPercentValid ? (
            <div className="mt-2 inline-flex rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-900">
              Allocation config warning: enabled expense types must total exactly 100%.
            </div>
          ) : null}
          <div className="mt-1 text-2xl font-semibold text-slate-900">
            {dbReady ? formatMoney(selectedMonthAllocatedBudget) : "-"}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
            <div className="rounded-md border border-slate-200 bg-slate-50 p-2">
              Income: {dbReady ? formatMoney(selectedMonthServiceIncomeTotal) : "-"}
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 p-2">
              Allocated Expenses:{" "}
              {dbReady ? formatMoney(selectedMonthAllocatedExpenses) : "-"}
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 p-2">
              Carry-over In:{" "}
              {dbReady ? formatMoney(carryOverBeforeSelectedMonth) : "-"}
            </div>
            <div
              className={`rounded-md border p-2 ${
                !dbReady
                  ? "border-slate-200 bg-slate-50"
                  : selectedMonthRemainingBudget >= 0
                    ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                    : "border-rose-200 bg-rose-50 text-rose-900"
              }`}
            >
              Remaining:{" "}
              {dbReady ? formatMoney(selectedMonthRemainingBudget) : "-"}
            </div>
          </div>

          <div className="mt-4">
            <div className="text-xs font-medium text-slate-600">
              Allocated Shares from Tithes & Offering ({budgetMonth})
            </div>
            <div className="mt-2 space-y-2">
              {dbReady ? (
                allocationShares.length === 0 ? (
                  <div className="rounded-md border border-slate-200 bg-slate-50 p-2 text-xs text-slate-600">
                    No enabled expense types for allocation.
                  </div>
                ) : (
                  allocationShares.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-slate-800">
                          {s.name}
                        </div>
                        <div className="text-xs text-slate-600">
                          {s.allocationPercent.toFixed(2)}%
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-slate-900">
                          {formatMoney(s.amount)}
                        </div>
                      </div>
                    </div>
                  ))
                )
              ) : (
                <div className="rounded-md border border-slate-200 bg-slate-50 p-2 text-xs text-slate-600">
                  -
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {view === "expenses" ? (
        <div className="space-y-4 w-full">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-sm font-medium text-slate-600">
              Total Expenses (Filtered)
            </div>
            <div className="mt-2 text-3xl font-semibold">
              {dbReady ? formatMoney(total) : "-"}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white">
          <div className="max-h-[calc(100vh-380px)] overflow-y-auto">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-left text-slate-700">
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Received By</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Amount</th>
                    {canEdit && !isAdmin ? (
                      <th className="px-4 py-3 font-medium">Actions</th>
                    ) : null}
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={canEdit && !isAdmin ? 5 : 4}
                        className="px-4 py-6 text-center text-slate-500"
                      >
                        No expense transactions found.
                      </td>
                    </tr>
                  ) : (
                    rows.map((r) => {
                      const isHighlighted = highlightExpenseId === r.id;
                      const hasActions = canEdit && !isAdmin;
                      const wrapperBase = "bg-emerald-50 border-y border-emerald-300";
                      const trClass = isHighlighted
                        ? "border-t-0"
                        : "border-t border-slate-100";
                      return (
                      <tr
                        key={r.id}
                        id={`expense-row-${r.id}`}
                        className={trClass}
                      >
                        <td
                          className={isHighlighted ? "p-0" : "px-4 py-3"}
                        >
                          {isHighlighted ? (
                            <div
                              className={`${wrapperBase} border-l rounded-l-xl ml-3 px-4 py-3`}
                            >
                              {r.type}
                            </div>
                          ) : (
                            r.type
                          )}
                        </td>
                        <td className={isHighlighted ? "p-0" : "px-4 py-3"}>
                          {isHighlighted ? (
                            <div className={`${wrapperBase} px-4 py-3`}>
                              {r.receivedBy}
                            </div>
                          ) : (
                            r.receivedBy
                          )}
                        </td>
                        <td
                          className={
                            isHighlighted ? "p-0" : "px-4 py-3 text-slate-600"
                          }
                        >
                          {isHighlighted ? (
                            <div
                              className={`${wrapperBase} px-4 py-3 text-slate-600`}
                            >
                              {r.date.toLocaleDateString()}
                            </div>
                          ) : (
                            r.date.toLocaleDateString()
                          )}
                        </td>
                        <td
                          className={isHighlighted ? "p-0 font-semibold" : "px-4 py-3 font-semibold"}
                        >
                          {isHighlighted ? (
                            <div
                              className={`${wrapperBase} px-4 py-3 ${
                                "border-r rounded-r-xl mr-3"
                              }`}
                            >
                              {formatMoney(Number(r.amount))}
                            </div>
                          ) : (
                            formatMoney(Number(r.amount))
                          )}
                        </td>
                        {hasActions ? (
                          <td
                            className="px-4 py-3"
                          >
                            <div className="flex flex-col gap-1">
                              {pendingVoidExpenseIds.has(r.id) ? (
                                <span className="inline-flex w-[116px] items-center justify-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-900 shadow-sm">
                                  Pending
                                </span>
                              ) : (
                                <form
                                  action={requestVoidExpenseAction.bind(null, r.id)}
                                >
                                  <input type="hidden" name="voidReason" defaultValue="" />
                                  <DeleteSubmitButton
                                    className="w-[116px]"
                                    requireReason
                                    confirmMessage={
                                      "Submit a void request? The expense stays active until an administrator approves."
                                    }
                                    reasonPromptMessage={
                                      "Reason for this void request (admin will review):"
                                    }
                                  >
                                    Request void
                                  </DeleteSubmitButton>
                                </form>
                              )}
                            </div>
                          </td>
                        ) : null}
                      </tr>
                    );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
          </div>
          {highlightExpenseId ? (
            <ExpenseHighlightScroller expenseId={highlightExpenseId} />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
