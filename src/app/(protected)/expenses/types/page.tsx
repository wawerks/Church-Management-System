import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SubmitButton } from "@/components/form-buttons";
import {
  createExpenseTypeAction,
} from "./actions";
import type { Role } from "@/generated/prisma/enums";
import { ExpenseTypeAllocationEditor } from "@/components/ExpenseTypeAllocationEditor";

export default async function ExpenseTypesPage() {
  await requireRole(["ADMIN"] satisfies Role[]);

  let dbReady = true;
  let rows: Array<{
    id: string;
    name: string;
    allocationPercent: number;
    isAllocatedFromServiceIncome: boolean;
  }> = [];
  try {
    const dbRows = await prisma.expenseType.findMany({ orderBy: { name: "asc" } });
    rows = dbRows.map((row) => ({
      id: row.id,
      name: row.name,
      allocationPercent: Number(row.allocationPercent),
      isAllocatedFromServiceIncome: row.isAllocatedFromServiceIncome,
    }));
  } catch {
    dbReady = false;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Expense Types</h1>
          <p className="mt-1 text-sm text-slate-600">
            Admin-only list of expense kinds and monthly allocation config.
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
        <form
          action={createExpenseTypeAction}
          className="flex flex-col gap-2 sm:flex-row"
          id="expense-types-add-type"
        >
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

      {dbReady ? <ExpenseTypeAllocationEditor rows={rows} /> : null}
    </div>
  );
}
