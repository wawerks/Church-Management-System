import Link from "next/link";
import { requireRole, getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/generated/prisma/enums";
import { deleteUserAction } from "./actions";
import { SubmitButton } from "@/components/form-buttons";

export default async function UsersPage() {
  await requireRole(["ADMIN"] satisfies Role[]);
  const session = await getServerSession();

  let users: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt: Date;
  }> = [];
  let dbReady = true;

  try {
    users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });
  } catch {
    dbReady = false;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Users &amp; roles</h1>
          <p className="mt-1 text-sm text-slate-600">
            Create logins and assign <strong>Admin</strong>,{" "}
            <strong>Pastor</strong> (view-only), or <strong>Staff</strong>{" "}
            (attendance, donations, reports).
          </p>
        </div>
        <Link
          href="/users/new"
          className="rounded-md bg-black px-3 py-2 text-sm font-medium text-white hover:bg-black/90"
        >
          + Add user
        </Link>
      </div>

      {!dbReady ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Database isn’t ready yet.
        </div>
      ) : null}

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-slate-700">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-6 text-center text-slate-500"
                  >
                    No users yet. Add one to grant access.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium">{u.name}</td>
                    <td className="px-4 py-3 text-slate-600">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-800">
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {session?.userId === u.id ? (
                        <span className="text-xs text-slate-500">You</span>
                      ) : (
                        <form
                          action={deleteUserAction.bind(null, u.id)}
                          method="post"
                        >
                          <SubmitButton
                            pendingLabel="Removing…"
                            className="rounded-md bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700"
                          >
                            Remove
                          </SubmitButton>
                        </form>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
