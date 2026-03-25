import Link from "next/link";
import { requireRole } from "@/lib/auth";
import type { Role } from "@/generated/prisma/enums";
import { createUserAction } from "../actions";
import { SubmitButton } from "@/components/form-buttons";

export default async function NewUserPage() {
  await requireRole(["ADMIN"] satisfies Role[]);

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Add user</h1>
          <p className="mt-1 text-sm text-slate-600">
            Choose a role: <strong>Pastor</strong> is view-only;{" "}
            <strong>Staff</strong> can run attendance, donations, expenses, and exports.
          </p>
        </div>
        <Link
          href="/users"
          className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Back
        </Link>
      </div>

      <form action={createUserAction} className="space-y-4">
        <label className="block">
          <div className="mb-1 text-sm font-medium text-slate-700">Name</div>
          <input
            name="name"
            required
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
          />
        </label>

        <label className="block">
          <div className="mb-1 text-sm font-medium text-slate-700">Email</div>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
          />
        </label>

        <label className="block">
          <div className="mb-1 text-sm font-medium text-slate-700">
            Password
          </div>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
          />
          <div className="mt-1 text-xs text-slate-500">At least 8 characters.</div>
        </label>

        <label className="block">
          <div className="mb-1 text-sm font-medium text-slate-700">Role</div>
          <select
            name="role"
            required
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            defaultValue="STAFF"
          >
            <option value="ADMIN">Admin — full access + user management</option>
            <option value="PASTOR">Pastor — view only</option>
            <option value="STAFF">
              Staff — attendance, donations, expenses, report exports
            </option>
            <option value="TREASURER">
              Treasurer — donations, tithes/offering, expenses, financial reports
            </option>
          </select>
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <div className="mb-1 text-sm font-medium text-slate-700">
              Phone number
            </div>
            <input
              name="phoneNumber"
              type="tel"
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
              placeholder="Optional"
            />
          </label>

          <label className="block">
            <div className="mb-1 text-sm font-medium text-slate-700">Birthday</div>
            <input
              name="birthdate"
              type="date"
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            />
          </label>
        </div>

        <label className="block">
          <div className="mb-1 text-sm font-medium text-slate-700">Address</div>
          <input
            name="address"
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            placeholder="Optional"
          />
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <Link
            href="/users"
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </Link>
          <SubmitButton
            pendingLabel="Creating…"
            className="rounded-md bg-black px-3 py-2 text-sm font-medium text-white hover:bg-black/90"
          >
            Create user
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
