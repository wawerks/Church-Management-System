import { requireRole, getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/generated/prisma/enums";
import { deleteUserAction } from "./actions";
import { AddUserModal } from "@/components/AddUserModal";
import { UserRowActionsMenu } from "@/components/UserRowActionsMenu";

export default async function UsersPage() {
  await requireRole(["ADMIN"] satisfies Role[]);
  const session = await getServerSession();

  let users: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    phoneNumber: string | null;
    address: string | null;
    birthdate: Date | null;
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
        phoneNumber: true,
        address: true,
        birthdate: true,
        createdAt: true,
      },
    });
  } catch {
    dbReady = false;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Users &amp; roles</h1>
          <p className="mt-1 text-sm text-slate-600">
            Create logins and assign <strong>Admin</strong>,{" "}
            <strong>Pastor</strong> (view-only), <strong>Staff</strong>{" "}
            (attendance, donations, reports), or{" "}
            <strong>Treasurer</strong> (financial workflows).
          </p>
        </div>
        <AddUserModal />
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
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Birthday</th>
                <th className="px-4 py-3 font-medium">Address</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="w-14 px-2 py-3 text-right font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-6 text-center text-slate-500"
                  >
                    No users yet. Add one to grant access.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium">
                      {u.name}
                      {session?.userId === u.id ? (
                        <span className="ml-2 text-xs font-normal text-slate-500">
                          (You)
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{u.email}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {u.phoneNumber ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {u.birthdate ? u.birthdate.toLocaleDateString() : "—"}
                    </td>
                    <td className="max-w-xs truncate px-4 py-3 text-slate-600">
                      {u.address ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-800">
                        {u.role}
                      </span>
                    </td>
                    <td className="px-2 py-3 text-right">
                      <UserRowActionsMenu
                        userId={u.id}
                        name={u.name}
                        email={u.email}
                        role={u.role as Role}
                        phoneNumber={u.phoneNumber}
                        address={u.address}
                        birthdateInput={u.birthdate ? u.birthdate.toISOString().slice(0, 10) : null}
                        isSelf={session?.userId === u.id}
                        deleteAction={
                          session?.userId === u.id
                            ? undefined
                            : deleteUserAction.bind(null, u.id)
                        }
                      />
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
