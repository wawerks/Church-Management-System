import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DeleteSubmitButton, SubmitButton } from "@/components/form-buttons";
import { createExpenseTypeAction, deleteExpenseTypeAction } from "./actions";
import type { Role } from "@/generated/prisma/enums";

export default async function ExpenseTypesPage() {
  await requireRole(["ADMIN"] satisfies Role[]);

  let dbReady = true;
  let rows: Array<{ id: string; name: string }> = [];
  try {
    rows = await prisma.expenseType.findMany({ orderBy: { name: "asc" } });
  } catch {
    dbReady = false;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Expense Types</h1>
          <p className="mt-1 text-sm text-slate-600">
            Admin-only list of expense kinds available to users.
          </p>
        </div>
        <Link
          href="/expenses"
          className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Back to Expenses
        </Link>
      </div>

      {!dbReady ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Database isn&apos;t ready yet. Run Prisma migration first.
        </div>
      ) : null}

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <form action={createExpenseTypeAction} className="flex flex-col gap-2 sm:flex-row">
          <input
            name="name"
            required
            placeholder="e.g. Transportation"
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
          />
          <SubmitButton
            pendingLabel="Adding..."
            className="rounded-md bg-black px-3 py-2 text-sm font-medium text-white hover:bg-black/90"
          >
            Add Type
          </SubmitButton>
        </form>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-slate-700">
                <th className="px-4 py-3 font-medium">Type Name</th>
                <th className="px-4 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-4 py-6 text-center text-slate-500">
                    No expense types yet.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">{r.name}</td>
                    <td className="px-4 py-3">
                      <form action={deleteExpenseTypeAction.bind(null, r.id)}>
                        <DeleteSubmitButton />
                      </form>
                    </td>
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
