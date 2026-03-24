import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole, requireSession } from "@/lib/auth";
import { canMutateMembers } from "@/lib/permissions";
import { deleteMemberAction } from "./actions";
import {
  GetSubmitButton,
  PendingGetForm,
  SubmitButton,
} from "@/components/form-buttons";
import type { Role } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";

export default async function MembersPage(props: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  await requireRole(["ADMIN", "PASTOR", "STAFF"] satisfies Role[]);
  const session = await requireSession();
  const canEdit = canMutateMembers(session.role);

  const qRaw = props.searchParams?.q;
  const q =
    typeof qRaw === "string" ? qRaw.trim() : Array.isArray(qRaw) ? qRaw[0]?.trim() ?? "" : "";

  const pageRaw = props.searchParams?.page;
  const page =
    typeof pageRaw === "string"
      ? Math.max(1, Number(pageRaw) || 1)
      : Array.isArray(pageRaw)
        ? Math.max(1, Number(pageRaw[0]) || 1)
        : 1;

  const take = 10;
  const skip = (page - 1) * take;

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
    familyGroup: { id: string; familyName: string } | null;
  }> = [];

  let total = 0;
  let dbReady = true;

  try {
    [total, members] = await Promise.all([
      prisma.member.count({ where }),
      prisma.member.findMany({
        where,
        take,
        skip,
        orderBy: { lastName: "asc" },
        include: { familyGroup: true },
      }),
    ]);
  } catch {
    dbReady = false;
  }

  const totalPages = Math.max(1, Math.ceil(total / take));

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
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
            <Link
              href="/members/new"
              className="rounded-md bg-black px-3 py-2 text-sm font-medium text-white hover:bg-black/90"
            >
              + Add Member
            </Link>
          ) : null}
        </div>
      </div>

      {!dbReady ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Database isn’t ready yet. Set up MySQL + run Prisma migrations.
        </div>
      ) : null}

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-slate-700">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Gender</th>
                <th className="px-4 py-3 font-medium">Family</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                {canEdit ? (
                  <th className="px-4 py-3 font-medium">Actions</th>
                ) : null}
              </tr>
            </thead>
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
                  <tr key={m.id} className="border-t border-slate-100">
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
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/members/${m.id}/edit`}
                            className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            Edit
                          </Link>

                          <form
                            action={deleteMemberAction.bind(null, m.id)}
                          >
                            <SubmitButton
                              pendingLabel="Deleting…"
                              className="rounded-md bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700"
                            >
                              Delete
                            </SubmitButton>
                          </form>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Link
          href={`/members?page=${Math.max(1, page - 1)}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
          className={`rounded-md border px-3 py-2 text-sm ${page <= 1 ? "cursor-not-allowed opacity-50" : "hover:bg-slate-50"}`}
          aria-disabled={page <= 1}
        >
          Previous
        </Link>

        <div className="text-sm text-slate-600">
          Page {page} of {totalPages}
        </div>

        <Link
          href={`/members?page=${Math.min(totalPages, page + 1)}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
          className={`rounded-md border px-3 py-2 text-sm ${page >= totalPages ? "cursor-not-allowed opacity-50" : "hover:bg-slate-50"}`}
          aria-disabled={page >= totalPages}
        >
          Next
        </Link>
      </div>
    </div>
  );
}

