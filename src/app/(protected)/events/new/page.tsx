import { requireRole } from "@/lib/auth";
import { createEventAction } from "../actions";
import { SubmitButton } from "@/components/form-buttons";
import type { Role } from "@/generated/prisma/enums";
import Link from "next/link";

export default async function NewEventPage() {
  await requireRole(["ADMIN"] satisfies Role[]);

  return (
    <div className="flex w-full justify-center px-0 py-10">
      <div className="w-full max-w-3xl">
      <div className="rounded-xl border border-slate-200 bg-white p-4 md:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Add Event</h1>
            <p className="mt-1 text-sm text-slate-600">
              Create a service date/event for attendance tracking.
            </p>
          </div>
          <Link
            href="/events"
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Back
          </Link>
        </div>

        <form action={createEventAction} className="space-y-5">
          <label className="block">
            <div className="mb-1 text-sm font-medium text-slate-700">Title</div>
            <input
              name="title"
              required
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
              placeholder="e.g., Sunday Service"
            />
          </label>

          <label className="block">
            <div className="mb-1 text-sm font-medium text-slate-700">
              Description (optional)
            </div>
            <textarea
              name="description"
              className="min-h-[90px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
              placeholder="Optional notes for staff"
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

          <div className="flex justify-end pt-2">
            <SubmitButton
              pendingLabel="Saving…"
              className="rounded-md bg-black px-3 py-2 text-sm font-medium text-white hover:bg-black/90"
            >
              Save Event
            </SubmitButton>
          </div>
        </form>
      </div>
      </div>
    </div>
  );
}

