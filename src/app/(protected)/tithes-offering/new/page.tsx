import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createServiceIncomeAction } from "../actions";
import { SubmitButton } from "@/components/form-buttons";
import type { Role } from "@/generated/prisma/enums";

export default async function NewServiceIncomePage() {
  await requireRole(["ADMIN", "STAFF", "TREASURER"] satisfies Role[]);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Add Tithes & Offering</h1>
          <p className="mt-1 text-sm text-slate-600">
            Record the total income for a Sunday service date.
          </p>
        </div>
        <Link
          href="/tithes-offering"
          className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Back
        </Link>
      </div>

      <form action={createServiceIncomeAction} className="space-y-5">
        <label className="block">
          <div className="mb-1 text-sm font-medium text-slate-700">
            Sunday Service Date
          </div>
          <input
            name="serviceDate"
            type="date"
            required
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
          />
        </label>

        <label className="block">
          <div className="mb-1 text-sm font-medium text-slate-700">
            Total Tithes & Offering
          </div>
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
            href="/tithes-offering"
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </Link>
          <SubmitButton
            pendingLabel="Saving..."
            className="rounded-md bg-black px-3 py-2 text-sm font-medium text-white hover:bg-black/90"
          >
            Save
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
