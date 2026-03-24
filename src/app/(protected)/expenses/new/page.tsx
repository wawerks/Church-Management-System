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
  try {
    expenseTypes = await prisma.expenseType.findMany({ orderBy: { name: "asc" } });
  } catch {
    // ignore: page already shows graceful state when list is empty
  }

  return (
    <div className="mx-auto max-w-2xl">
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
            Claimed By
          </div>
          <input
            name="claimedBy"
            required
            placeholder="Person name"
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
          />
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
  );
}
