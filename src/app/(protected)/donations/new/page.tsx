import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createDonationAction } from "../actions";
import { SubmitButton } from "@/components/form-buttons";
import type { Role } from "@/generated/prisma/enums";

export default async function NewDonationPage() {
  await requireRole(["ADMIN", "STAFF", "TREASURER"] satisfies Role[]);

  let members: Array<{ id: string; name: string }> = [];
  try {
    const list = await prisma.member.findMany({
      orderBy: { lastName: "asc" },
      select: { id: true, firstName: true, lastName: true },
    });
    members = list.map((m) => ({
      id: m.id,
      name: `${m.firstName} ${m.lastName}`,
    }));
  } catch {
    // ignore
  }

  return (
    <div className="flex min-h-[calc(100vh-2rem)] items-center justify-center">
      <div className="w-full max-w-3xl rounded-xl border border-slate-200 bg-white p-5 md:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Add Donation</h1>
            <p className="mt-1 text-sm text-slate-600">
              Record member donations separately from service income.
            </p>
          </div>
          <Link
            href="/donations"
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Back
          </Link>
        </div>

        <form
          action={createDonationAction}
          className="space-y-5"
        >
          <label className="block">
            <div className="mb-1 text-sm font-medium text-slate-700">
              Member / Donator
            </div>
            <input
              name="memberName"
              required
              list="member-name-options"
              placeholder="Search or type a name…"
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
              autoComplete="off"
            />
            <datalist id="member-name-options">
              {members.map((m) => (
                <option key={m.id} value={m.name} />
              ))}
            </datalist>
            {members.length === 0 ? (
              <div className="mt-2 text-sm text-amber-700">
                Members not available yet (DB not ready). You can still type a
                name.
              </div>
            ) : null}
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <div className="mb-1 text-sm font-medium text-slate-700">
                Amount
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

            <label className="block">
              <div className="mb-1 text-sm font-medium text-slate-700">Type</div>
              <select
                name="type"
                required
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                defaultValue="DONATION"
              >
                <option value="DONATION">Donation</option>
                <option value="OTHERS">Others</option>
              </select>
            </label>
          </div>

          <label className="block">
            <div className="mb-1 text-sm font-medium text-slate-700">Date</div>
            <input
              name="date"
              type="date"
              required
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            />
          </label>

          <div className="flex justify-end gap-2">
            <Link
              href="/donations"
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </Link>
            <SubmitButton
              pendingLabel="Saving…"
              className="rounded-md bg-black px-3 py-2 text-sm font-medium text-white hover:bg-black/90"
            >
              Save Donation
            </SubmitButton>
          </div>
        </form>
      </div>
    </div>
  );
}

