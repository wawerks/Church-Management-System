import { prisma } from "@/lib/prisma";
import { requireRole, requireSession } from "@/lib/auth";
import { canMutateEvents } from "@/lib/permissions";
import type { Role } from "@/generated/prisma/enums";
import { deleteEventAction } from "./actions";
import { GetSubmitButton, PendingGetForm } from "@/components/form-buttons";
import type { Prisma } from "@/generated/prisma/client";
import { RowActionsMenu } from "@/components/RowActionsMenu";
import { AddEventModal } from "@/components/AddEventModal";

function formatDate(d: Date) {
  return d.toLocaleDateString();
}

export default async function EventsPage(props: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  await requireRole(["ADMIN", "PASTOR", "TREASURER"] satisfies Role[]);
  const session = await requireSession();
  const canEdit = canMutateEvents(session.role);

  const qRaw = props.searchParams?.q;
  const q =
    typeof qRaw === "string"
      ? qRaw.trim()
      : Array.isArray(qRaw)
        ? qRaw[0]?.trim() ?? ""
        : "";

  const take = 20;
  const where: Prisma.EventWhereInput = q
    ? {
        title: { contains: q },
      }
    : {};

  let events: Array<{
    id: string;
    title: string;
    description: string | null;
    date: Date;
  }> = [];
  let dbReady = true;

  try {
    events = await prisma.event.findMany({
      where,
      orderBy: { date: "desc" },
      take,
    });
  } catch {
    dbReady = false;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Events</h1>
          <p className="mt-1 text-sm text-slate-600">
            {canEdit
              ? "Create services/events for attendance."
              : "View scheduled services (Pastor: read-only)."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <PendingGetForm method="GET" className="flex items-center gap-2">
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search events..."
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
            <AddEventModal />
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
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Date</th>
                {canEdit ? (
                  <th className="px-4 py-3 font-medium">Actions</th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {events.length === 0 ? (
                <tr>
                  <td
                    colSpan={canEdit ? 3 : 2}
                    className="px-4 py-6 text-center text-slate-500"
                  >
                    No events found.
                  </td>
                </tr>
              ) : (
                events.map((e) => (
                  <tr key={e.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">
                      <div className="font-medium">{e.title}</div>
                      {e.description ? (
                        <div className="mt-1 text-xs text-slate-500">
                          {e.description}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatDate(e.date)}
                    </td>
                    {canEdit ? (
                      <td className="px-4 py-3">
                        <RowActionsMenu
                          rowId={e.id}
                          editHref={`/events/${e.id}/edit`}
                          deleteAction={deleteEventAction.bind(null, e.id)}
                          deleteLabel="Delete"
                          deleteConfirmMessage="Permanently delete this event?"
                        />
                      </td>
                    ) : null}
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

