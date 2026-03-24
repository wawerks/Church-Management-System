import Link from "next/link";
import { requireRole, requireSession } from "@/lib/auth";
import { canMutateDonations } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type { Role } from "@/generated/prisma/enums";
import {
  GetSubmitButton,
  PendingGetForm,
  SubmitButton,
} from "@/components/form-buttons";
import { deleteExpenseAction } from "./actions";

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

export default async function ExpensesPage(props: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole(["ADMIN", "PASTOR", "STAFF", "TREASURER"] satisfies Role[]);
  const session = await requireSession();
  const canEdit = canMutateDonations(session.role);
  const searchParams = await props.searchParams;
  const isAdmin = session.role === "ADMIN";

  let expenseTypes: Array<{ id: string; name: string }> = [];
  try {
    expenseTypes = await prisma.expenseType.findMany({ orderBy: { name: "asc" } });
  } catch {
    // ignore
  }
  const expenseTypeNames = expenseTypes.map((t) => t.name);

  const typeRaw = searchParams?.type;
  const type =
    typeof typeRaw === "string" && expenseTypeNames.includes(typeRaw)
      ? typeRaw
      : undefined;

  const from = parseDateInput(searchParams?.from);
  const to = parseDateInput(searchParams?.to);

  let where: Prisma.ExpenseWhereInput = {};
  if (type) where = { ...where, type };
  if (from || to) {
    where = {
      ...where,
      date: {
        ...(from ? { gte: startOfDay(from) } : {}),
        ...(to ? { lte: endOfDay(to) } : {}),
      },
    };
  }

  let dbReady = true;
  let rows: Array<{
    id: string;
    type: string;
    claimedBy: string;
    date: Date;
    amount: string;
  }> = [];
  let total = 0;

  try {
    const [list, agg] = await Promise.all([
      prisma.expense.findMany({
        where,
        orderBy: { date: "desc" },
        take: 100,
      }),
      prisma.expense.aggregate({
        _sum: { amount: true },
        where,
      }),
    ]);

    rows = list.map((r) => ({
      id: r.id,
      type: r.type,
      claimedBy: r.claimedBy,
      date: r.date,
      amount: r.amount.toString(),
    }));
    total = Number(agg._sum.amount ?? 0);
  } catch {
    dbReady = false;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
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
            <Link
              href="/expenses/new"
              className="rounded-md bg-black px-3 py-2 text-sm font-medium text-white hover:bg-black/90"
            >
              + Add Expense
            </Link>
          </div>
        ) : null}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <PendingGetForm method="GET" className="grid gap-3 md:grid-cols-4">
          <label className="block">
            <div className="mb-1 text-sm font-medium text-slate-700">Type</div>
            <select
              name="type"
              defaultValue={type ?? ""}
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

          <label className="block">
            <div className="mb-1 text-sm font-medium text-slate-700">From</div>
            <input
              type="date"
              name="from"
              defaultValue={
                typeof searchParams?.from === "string"
                  ? searchParams.from
                  : undefined
              }
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            />
          </label>

          <label className="block">
            <div className="mb-1 text-sm font-medium text-slate-700">To</div>
            <input
              type="date"
              name="to"
              defaultValue={
                typeof searchParams?.to === "string" ? searchParams.to : undefined
              }
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            />
          </label>

          <div className="flex items-end gap-2">
            <GetSubmitButton
              pendingLabel="Applying..."
              className="h-10 rounded-md bg-black px-3 text-sm font-medium text-white hover:bg-black/90"
            >
              Apply
            </GetSubmitButton>
            <Link
              href="/expenses"
              className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center"
            >
              Reset
            </Link>
          </div>
        </PendingGetForm>
      </div>

      {!dbReady ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Database isn&apos;t ready yet. Set up MySQL + run Prisma migrations.
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-1">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-sm font-medium text-slate-600">
            Total Expenses (Filtered)
          </div>
          <div className="mt-2 text-3xl font-semibold">
            {dbReady ? formatMoney(total) : "-"}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-slate-700">
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Claimed By</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                {canEdit ? (
                  <th className="px-4 py-3 font-medium">Actions</th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={canEdit ? 5 : 4}
                    className="px-4 py-6 text-center text-slate-500"
                  >
                    No expense transactions found.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">{r.type}</td>
                    <td className="px-4 py-3">{r.claimedBy}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {r.date.toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 font-semibold">
                      {formatMoney(Number(r.amount))}
                    </td>
                    {canEdit ? (
                      <td className="px-4 py-3">
                        <form action={deleteExpenseAction.bind(null, r.id)}>
                          <SubmitButton
                            pendingLabel="Deleting..."
                            className="rounded-md bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700"
                          >
                            Delete
                          </SubmitButton>
                        </form>
                      </td>
                    ) : null}
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
