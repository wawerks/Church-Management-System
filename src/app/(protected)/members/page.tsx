import { prisma } from "@/lib/prisma";
import { requireRole, requireSession } from "@/lib/auth";
import { canMutateMembers } from "@/lib/permissions";
import { deleteMemberAction } from "./actions";
import { GetSubmitButton, PendingGetForm } from "@/components/form-buttons";
import type { Role } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import { AddMemberModal } from "@/components/AddMemberModal";
import { MemberRowActionsMenu } from "@/components/MemberRowActionsMenu";

export default async function MembersPage(props: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole(["ADMIN", "PASTOR", "STAFF", "TREASURER"] satisfies Role[]);
  const session = await requireSession();
  const canEdit = canMutateMembers(session.role);

  const searchParams = await props.searchParams;
  const qRaw = searchParams?.q;
  const q =
    typeof qRaw === "string" ? qRaw.trim() : Array.isArray(qRaw) ? qRaw[0]?.trim() ?? "" : "";

  const where: Prisma.MemberWhereInput = q
    ? {
        OR: [
          { firstName: { contains: q } },
          { lastName: { contains: q } },
        ],
      }
    : {};

  let members: Array<{
    id: string;
    firstName: string;
    lastName: string;
    gender: string | null;
    birthdate: Date | null;
    contactNumber: string | null;
    address: string | null;
    familyGroup: { id: string; familyName: string } | null;
  }> = [];

  let dbReady = true;

  try {
    members = await prisma.member.findMany({
      where,
      orderBy: { lastName: "asc" },
      include: { familyGroup: true },
    });
  } catch {
    dbReady = false;
  }

  let familyGroups: Array<{ id: string; familyName: string }> = [];
  try {
    familyGroups = await prisma.familyGroup.findMany({
      orderBy: { familyName: "asc" },
      select: { id: true, familyName: true },
    });
  } catch {
    // ignore
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Members</h1>
          <p className="mt-1 text-sm text-slate-600">
            {canEdit
              ? "Add, edit, delete, and search members."
              : "View members (Pastor: read-only)."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <PendingGetForm method="GET" className="flex items-center gap-2">
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search by name..."
              className="w-56 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            />
            <GetSubmitButton
              pendingLabel="Searching…"
              className="rounded-md bg-black px-3 py-2 text-sm font-medium text-white hover:bg-black/90"
            >
              Search
            </GetSubmitButton>
          </PendingGetForm>
          {canEdit ? (
            <AddMemberModal familyGroups={familyGroups} />
          ) : null}
        </div>
      </div>

      {!dbReady ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Database isn’t ready yet. Set up MySQL + run Prisma migrations.
        </div>
      ) : null}

      <div className="flex h-[calc(100vh-140px)] flex-col rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto border-b border-slate-100">
          <table className="min-w-full table-fixed text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-slate-700">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Gender</th>
                <th className="px-4 py-3 font-medium">Family</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                {canEdit ? (
                  <th className="w-14 px-2 py-3 text-right font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                ) : null}
              </tr>
            </thead>
          </table>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          <table className="min-w-full table-fixed text-sm">
            <tbody>
              {members.length === 0 ? (
                <tr>
                  <td
                    colSpan={canEdit ? 5 : 4}
                    className="px-4 py-6 text-center text-slate-500"
                  >
                    No members found.
                  </td>
                </tr>
              ) : (
                members.map((m) => (
                  <tr
                    key={m.id}
                    className="border-t border-slate-100 odd:bg-white even:bg-slate-50"
                  >
                    <td className="px-4 py-3 font-medium">
                      {m.firstName} {m.lastName}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {m.gender ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {m.familyGroup?.familyName ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {m.contactNumber ?? "—"}
                    </td>
                    {canEdit ? (
                      <td className="px-2 py-3 text-right">
                        <MemberRowActionsMenu
                          memberId={m.id}
                          firstName={m.firstName}
                          lastName={m.lastName}
                          gender={m.gender}
                          birthdateInput={
                            m.birthdate ? m.birthdate.toISOString().slice(0, 10) : ""
                          }
                          contactNumber={m.contactNumber}
                          address={m.address ?? null}
                          familyGroupId={m.familyGroup?.id ?? null}
                          familyGroupName={m.familyGroup?.familyName ?? null}
                          familyGroups={familyGroups}
                          deleteAction={deleteMemberAction.bind(null, m.id)}
                        />
                      </td>
                    ) : null}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-100 px-4 py-2 text-sm text-slate-600">
          {members.length} member(s)
        </div>
      </div>
    </div>
  );
}

