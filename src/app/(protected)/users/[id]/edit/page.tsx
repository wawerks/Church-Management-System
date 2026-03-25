import Link from "next/link";
import { requireRole, getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/generated/prisma/enums";
import { EditUserForm } from "./EditUserForm";

export default async function EditUserPage(props: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["ADMIN"] satisfies Role[]);
  const session = await getServerSession();
  const { id } = await props.params;

  let user: {
    id: string;
    name: string;
    email: string;
    role: Role;
    phoneNumber: string | null;
    address: string | null;
    birthdate: Date | null;
  } | null = null;
  try {
    user = await prisma.user.findUnique({
      where: { id },
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
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        User not found or database isn’t ready yet.
      </div>
    );
  }

  const isSelf = session?.userId === user.id;

  return (
    <div className="flex min-h-[calc(100vh-2rem)] items-center justify-center px-4 py-8">
      <div className="w-full max-w-3xl rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Edit user</h1>
            <p className="mt-1 text-sm text-slate-600">
              Update display name and role. Email and password are unchanged
              here.
            </p>
          </div>
          <Link
            href="/users"
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Back
          </Link>
        </div>

        <EditUserForm
          userId={user.id}
          isSelf={isSelf}
          defaultName={user.name}
          defaultRole={user.role}
          email={user.email}
          defaultPhoneNumber={user.phoneNumber}
          defaultAddress={user.address}
          defaultBirthdate={user.birthdate}
        />
      </div>
    </div>
  );
}
