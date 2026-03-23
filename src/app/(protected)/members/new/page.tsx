import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createMemberAction } from "../actions";
import type { Role } from "@/generated/prisma/enums";
import Link from "next/link";

export default async function NewMemberPage() {
  await requireRole(["ADMIN", "PASTOR", "STAFF"] satisfies Role[]);

  let familyGroups: Array<{ id: string; familyName: string }> = [];
  try {
    familyGroups = await prisma.familyGroup.findMany({
      orderBy: { familyName: "asc" },
      select: { id: true, familyName: true },
    });
  } catch {
    // ignore - DB may not be ready yet
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold">Add Member</h1>
        <p className="mt-1 text-sm text-slate-600">
          Enter member details and assign to a family group.
        </p>
      </div>

      <form action={createMemberAction} method="post" className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <div className="mb-1 text-sm font-medium text-slate-700">
              First name
            </div>
            <input
              name="firstName"
              required
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            />
          </label>

          <label className="block">
            <div className="mb-1 text-sm font-medium text-slate-700">
              Last name
            </div>
            <input
              name="lastName"
              required
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <label className="block">
            <div className="mb-1 text-sm font-medium text-slate-700">
              Gender
            </div>
            <select
              name="gender"
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
              defaultValue=""
            >
              <option value="">—</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </select>
          </label>

          <label className="block">
            <div className="mb-1 text-sm font-medium text-slate-700">
              Birthdate
            </div>
            <input
              name="birthdate"
              type="date"
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            />
          </label>

          <label className="block">
            <div className="mb-1 text-sm font-medium text-slate-700">
              Contact number
            </div>
            <input
              name="contactNumber"
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            />
          </label>
        </div>

        <label className="block">
          <div className="mb-1 text-sm font-medium text-slate-700">Address</div>
          <input
            name="address"
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
          />
        </label>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-sm font-semibold text-slate-800">
            Family Group
          </div>
          <div className="mt-1 text-xs text-slate-600">
            Choose an existing group, or enter a new family group name.
          </div>

          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <label className="block">
              <div className="mb-1 text-sm font-medium text-slate-700">
                Select group
              </div>
              <select
                name="familyGroupId"
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                defaultValue=""
              >
                <option value="">— No group —</option>
                {familyGroups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.familyName}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <div className="mb-1 text-sm font-medium text-slate-700">
                New group name (optional)
              </div>
              <input
                name="familyGroupName"
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                placeholder="e.g., Family of John"
              />
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Link
            href="/members"
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="rounded-md bg-black px-3 py-2 text-sm font-medium text-white hover:bg-black/90"
          >
            Save Member
          </button>
        </div>
      </form>
    </div>
  );
}

