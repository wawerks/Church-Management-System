import Link from "next/link";
import { requireRole, requireSession } from "@/lib/auth";
import { createExpenseAction } from "../actions";
import { SubmitButton } from "@/components/form-buttons";
import type { Role } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { canManageUsers } from "@/lib/permissions";

export default async function NewExpensePage() {
  await requireRole(["ADMIN", "STAFF", "TREASURER"] satisfies Role[]);
  const session = await requireSession();

  let expenseTypes: Array<{ id: string; name: string }> = [];
  let receivedBySuggestions: string[] = [];
  try {
    expenseTypes = await prisma.expenseType.findMany({ orderBy: { name: "asc" } });
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
    receivedBySuggestions = Array.from(names).sort((a, b) => a.localeCompare(b));
  } catch {
    // ignore: page already shows graceful state when list is empty
  }

  return (
    <div className="flex min-h-[calc(100vh-2rem)] items-center justify-center px-4 py-8">
      <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Add Expense</h1>
            <p className="mt-1 text-sm text-slate-600">
              Save an expense transaction with type, date, and amount.
            </p>
          </div>
          <Link
            href="/expenses"
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Back
          </Link>
        </div>

        <form action={createExpenseAction} className="space-y-5">
          <label className="block">
            <div className="mb-1 text-sm font-medium text-slate-700">
              Expense Type
            </div>
            <select
              name="type"
              required
              defaultValue={expenseTypes[0]?.name ?? ""}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
              disabled={expenseTypes.length === 0}
            >
              {expenseTypes.length === 0 ? (
                <option value="" disabled>
                  No expense types available
                </option>
              ) : (
                expenseTypes.map((t) => (
                  <option key={t.id} value={t.name}>
                    {t.name}
                  </option>
                ))
              )}
            </select>
            {expenseTypes.length === 0 ? (
              <div className="mt-2 text-sm text-amber-700">
                No expense types yet.
                {canManageUsers(session.role) ? (
                  <>
                    {" "}
                    Add types first in{" "}
                    <Link href="/expenses/types" className="underline">
                      Expense Types
                    </Link>
                    .
                  </>
                ) : null}
              </div>
            ) : null}
          </label>

          <label className="block">
            <div className="mb-1 text-sm font-medium text-slate-700">
              Received By
            </div>
            <input
              name="receivedBy"
              required
              placeholder="Person who received the money"
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
              list="received-by-options"
              autoComplete="off"
            />
            <datalist id="received-by-options">
              {receivedBySuggestions.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
            <p className="mt-1 text-xs text-slate-500">
              Search from existing names or type a new one.
            </p>
          </label>

          <label className="block">
            <div className="mb-1 text-sm font-medium text-slate-700">Date</div>
            <input
              name="date"
              type="date"
              required
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            />
          </label>

          <label className="block">
            <div className="mb-1 text-sm font-medium text-slate-700">Amount</div>
            <input
              name="amount"
              required
              type="number"
              step="0.01"
              min="0"
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            />
          </label>

          <div className="flex justify-end gap-2">
            <Link
              href="/expenses"
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </Link>
            <SubmitButton
              pendingLabel="Saving..."
              disabled={expenseTypes.length === 0}
              className="rounded-md bg-black px-3 py-2 text-sm font-medium text-white hover:bg-black/90"
            >
              Save Expense
            </SubmitButton>
          </div>
        </form>
      </div>
    </div>
  );
}
