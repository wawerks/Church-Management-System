import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createDonationAction } from "../actions";
import type { Role } from "@/generated/prisma/enums";

export default async function NewDonationPage() {
  await requireRole(["ADMIN", "PASTOR"] satisfies Role[]);

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
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Add Donation</h1>
          <p className="mt-1 text-sm text-slate-600">
            Record tithes and other donations by member.
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
        method="post"
        className="space-y-5"
      >
        <label className="block">
          <div className="mb-1 text-sm font-medium text-slate-700">Member</div>
          <select
            name="memberId"
            required
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            defaultValue=""
          >
            <option value="" disabled>
              Select a member
            </option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          {members.length === 0 ? (
            <div className="mt-2 text-sm text-amber-700">
              Members not available yet (DB not ready).
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
              defaultValue="TITHE"
            >
              <option value="TITHE">Tithe</option>
              <option value="OFFERING">Offering</option>
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
          <button
            type="submit"
            className="rounded-md bg-black px-3 py-2 text-sm font-medium text-white hover:bg-black/90"
          >
            Save Donation
          </button>
        </div>
      </form>
    </div>
  );
}

