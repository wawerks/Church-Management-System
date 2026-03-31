"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type ExpenseTypeOption = { id: string; name: string };

export function ExpensesFilters({
  expenseTypes,
  type,
  view,
  budgetMonth,
  monthOptions,
  highlight,
}: {
  expenseTypes: ExpenseTypeOption[];
  type?: string;
  view?: string;
  budgetMonth: string;
  monthOptions: string[];
  highlight?: string;
}) {
  const router = useRouter();

  const [draftType, setDraftType] = useState(type ?? "");
  const [draftBudgetMonth, setDraftBudgetMonth] = useState(budgetMonth);

  useEffect(() => {
    setDraftType(type ?? "");
    setDraftBudgetMonth(budgetMonth);
  }, [type, budgetMonth]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (draftType) params.set("type", draftType);
    if (view) params.set("view", view);
    if (draftBudgetMonth) params.set("budgetMonth", draftBudgetMonth);
    if (highlight) params.set("highlight", highlight);
    const s = params.toString();
    return s;
  }, [draftType, draftBudgetMonth, view, highlight]);

  function pushNow(next?: {
    type?: string;
    budgetMonth?: string;
  }) {
    const params = new URLSearchParams(queryString);
    if (next) {
      if (next.type === undefined) {
        // keep
      } else if (next.type) params.set("type", next.type);
      else params.delete("type");

      if (next.budgetMonth === undefined) {
        // keep
      } else if (next.budgetMonth) params.set("budgetMonth", next.budgetMonth);
      else params.delete("budgetMonth");
    }

    const qs = params.toString();
    router.push(`/expenses${qs ? `?${qs}` : ""}`);
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="grid gap-3 md:grid-cols-3">
        {view !== "summary" ? (
          <label className="block">
            <div className="mb-1 text-sm font-medium text-slate-700">Type</div>
            <select
              value={draftType}
              onChange={(e) => {
                const v = e.target.value;
                setDraftType(v);
                pushNow({ type: v });
              }}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="">All types</option>
              {expenseTypes.map((t) => (
                <option key={t.id} value={t.name}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <div />
        )}

        {view !== "summary" ? (
          <label className="block">
            <div className="mb-1 text-sm font-medium text-slate-700">Budget Month</div>
            <select
              value={draftBudgetMonth}
              onChange={(e) => {
                const v = e.target.value;
                setDraftBudgetMonth(v);
                pushNow({ budgetMonth: v });
              }}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              {monthOptions.map((month) => (
                <option key={month} value={month}>
                  {month}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <div />
        )}

        <div className="flex items-end gap-2">
          <Link
            href="/expenses"
            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center"
          >
            Reset
          </Link>
        </div>
      </div>
    </div>
  );
}

