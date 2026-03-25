import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/generated/prisma/enums";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { updateSelfProfileAction } from "../actions";

function toDateInputValue(d: Date | null) {
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default async function EditProfilePage() {
  const session = await requireSession();

  let user:
    | {
        id: string;
        name: string;
        email: string;
        role: Role;
        phoneNumber: string | null;
        address: string | null;
        birthdate: Date | null;
      }
    | null = null;

  try {
    user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phoneNumber: true,
        address: true,
        birthdate: true,
      },
    });
  } catch {
    user = null;
  }

  if (!user) {
    return (
      <div className="flex w-full justify-center px-0 py-10">
        <div className="w-full max-w-6xl rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
          Unable to load your profile. Try signing out and back in.
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full justify-center px-0 py-10">
      <div className="w-full max-w-6xl rounded-xl border border-slate-200 bg-white p-10 shadow-sm md:p-12 min-h-[640px]">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Profile</h1>
            <p className="mt-1 text-sm text-slate-600">
              Editing your account details. Update what you need, then save.
            </p>
          </div>
          <Link
            href="/profile"
            className="shrink-0 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:self-auto"
          >
            Back
          </Link>
        </div>

        <form action={updateSelfProfileAction.bind(null, user.id)} className="space-y-5">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <dt className="text-sm font-medium text-slate-600">Name</dt>
              <input
                name="name"
                required
                defaultValue={user.name}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
              />
            </div>

            <div className="space-y-1.5">
              <dt className="text-sm font-medium text-slate-600">Email</dt>
              <div className="rounded-md border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
                {user.email}
              </div>
            </div>

            <div className="space-y-1.5">
              <dt className="text-sm font-medium text-slate-600">Phone</dt>
              <input
                name="phoneNumber"
                type="tel"
                defaultValue={user.phoneNumber ?? ""}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
                placeholder="Optional"
              />
            </div>

            <div className="space-y-1.5">
              <dt className="text-sm font-medium text-slate-600">Birthday</dt>
              <input
                name="birthdate"
                type="date"
                defaultValue={toDateInputValue(user.birthdate)}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <dt className="text-sm font-medium text-slate-600">Address</dt>
              <input
                name="address"
                defaultValue={user.address ?? ""}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
                placeholder="Optional"
              />
            </div>
          </dl>

          <div className="flex justify-end gap-2 pt-2">
            <Link
              href="/profile"
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </Link>
            <ConfirmSubmitButton
              pendingLabel="Saving…"
              confirmMessage="Save changes to your profile?"
              className="rounded-md bg-black px-3 py-2 text-sm font-medium text-white hover:bg-black/90"
            >
              Save Changes
            </ConfirmSubmitButton>
          </div>
        </form>
      </div>
    </div>
  );
}

