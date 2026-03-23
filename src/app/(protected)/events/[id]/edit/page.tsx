import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { updateEventAction } from "../../actions";
import type { Role } from "@/generated/prisma/enums";

function toDateInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default async function EditEventPage(props: {
  params: { id: string };
}) {
  await requireRole(["ADMIN", "PASTOR"] satisfies Role[]);

  const eventId = props.params.id;

  let event:
    | (Awaited<ReturnType<typeof prisma.event.findUnique>>)
    | null = null;
  try {
    event = await prisma.event.findUnique({ where: { id: eventId } });
  } catch {
    event = null;
  }

  if (!event) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Event not found or database isn’t ready yet.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Edit Event</h1>
          <p className="mt-1 text-sm text-slate-600">
            Update title/description and service date.
          </p>
        </div>
        <Link
          href="/events"
          className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Back
        </Link>
      </div>

      <form
        action={updateEventAction.bind(null, event.id)}
        method="post"
        className="space-y-5"
      >
        <label className="block">
          <div className="mb-1 text-sm font-medium text-slate-700">Title</div>
          <input
            name="title"
            required
            defaultValue={event.title}
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
          />
        </label>

        <label className="block">
          <div className="mb-1 text-sm font-medium text-slate-700">
            Description
          </div>
          <textarea
            name="description"
            defaultValue={event.description ?? ""}
            className="min-h-[90px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
          />
        </label>

        <label className="block">
          <div className="mb-1 text-sm font-medium text-slate-700">Date</div>
          <input
            name="date"
            type="date"
            required
            defaultValue={toDateInputValue(event.date)}
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
          />
        </label>

        <div className="flex justify-end gap-2">
          <Link
            href="/events"
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="rounded-md bg-black px-3 py-2 text-sm font-medium text-white hover:bg-black/90"
          >
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}

