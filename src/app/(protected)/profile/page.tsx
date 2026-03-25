import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteSelfProfileAction } from "./actions";
import { ProfileActionsMenu } from "@/components/ProfileActionsMenu";

export default async function ProfilePage() {
  const session = await requireSession();

  let user: {
    name: string;
    email: string;
    role: string;
    phoneNumber: string | null;
    address: string | null;
    birthdate: Date | null;
    createdAt: Date;
  } | null = null;

  try {
    user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        name: true,
        email: true,
        role: true,
        phoneNumber: true,
        address: true,
        birthdate: true,
        createdAt: true,
      },
    });
  } catch {
    user = null;
  }

  if (!user) {
    return (
      <div className="flex w-full justify-center px-0 py-10">
        <div className="w-full max-w-6xl rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
          Could not load your profile. Try signing out and back in.
        </div>
      </div>
    );
  }

  const rows: Array<{ label: string; value: string }> = [
    { label: "Name", value: user.name },
    { label: "Email", value: user.email },
    { label: "Role", value: user.role },
    { label: "Phone", value: user.phoneNumber?.trim() || "—" },
    {
      label: "Birthday",
      value: user.birthdate ? user.birthdate.toLocaleDateString() : "—",
    },
    { label: "Address", value: user.address?.trim() || "—" },
    {
      label: "Member since",
      value: user.createdAt.toLocaleDateString(),
    },
  ];

  const birthdateInput = user.birthdate
    ? user.birthdate.toISOString().slice(0, 10)
    : "";

  return (
    <div className="flex w-full justify-center px-0 py-10">
      <div className="w-full max-w-6xl rounded-xl border border-slate-200 bg-white p-10 shadow-sm md:p-12 min-h-[640px]">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Profile</h1>
            <p className="mt-1 text-sm text-slate-600">
              Your account details as stored in the system.
            </p>
          </div>
          <div className="flex items-start justify-between gap-3 sm:items-center sm:self-auto">
            <Link
              href="/dashboard"
              className="shrink-0 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Back
            </Link>

            <ProfileActionsMenu
              userId={session.userId}
              name={user.name}
              email={user.email}
              role={user.role as any}
              phoneNumber={user.phoneNumber}
              address={user.address}
              birthdateInput={birthdateInput}
              deleteAction={deleteSelfProfileAction.bind(null, session.userId)}
            />
          </div>
        </div>

        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {rows.map((r) => (
            <div key={r.label} className="space-y-1.5">
              <dt className="text-sm font-medium text-slate-600">{r.label}</dt>
              <dd className="rounded-md border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900">
                {r.value}
              </dd>
            </div>
          ))}
        </dl>

        <p className="mt-4 text-xs text-slate-500">
          To change your name, phone, address, or birthday, an admin can update
          your user record under{" "}
          <Link href="/users" className="font-medium text-[#236d88] underline">
            Users &amp; roles
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
