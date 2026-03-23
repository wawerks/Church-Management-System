"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type MemberRow = { id: string; firstName: string; lastName: string };
type EventRow = { id: string; title: string; date: string | Date };
type Status = "PRESENT" | "ABSENT";

export function AttendanceMarkForm(props: {
  events: EventRow[];
  selectedEventId: string | null;
  members: MemberRow[];
  initialStatuses: Record<string, Status | undefined>;
}) {
  const router = useRouter();

  const selectedId =
    props.selectedEventId ?? props.events[0]?.id ?? null;

  const [eventId, setEventId] = useState<string | null>(selectedId);
  const [statuses, setStatuses] = useState<Record<string, Status>>(() => {
    const initial: Record<string, Status> = {};
    for (const m of props.members) {
      initial[m.id] = props.initialStatuses[m.id] ?? "ABSENT";
    }
    return initial;
  });

  useEffect(() => {
    const initial: Record<string, Status> = {};
    for (const m of props.members) {
      initial[m.id] = props.initialStatuses[m.id] ?? "ABSENT";
    }
    setStatuses(initial);
    setEventId(selectedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.selectedEventId, props.members.length]);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const eventOptions = useMemo(() => props.events, [props.events]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!eventId) return;

    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/attendance/mark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          records: statuses,
        }),
      });

      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; message?: string }
        | null;

      if (!res.ok || !data?.ok) {
        setMessage(data?.message ?? "Could not save attendance.");
        return;
      }

      setMessage("Attendance marked successfully.");
      router.refresh();
    } catch {
      setMessage("Network error while saving attendance.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <label className="block">
          <div className="mb-1 text-sm font-medium text-slate-700">Service</div>
          <select
            value={eventId ?? ""}
            onChange={(e) => {
              const next = e.target.value;
              setEventId(next);
              router.push(`/attendance?eventId=${encodeURIComponent(next)}`);
            }}
            className="w-72 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            {eventOptions.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.title} ({new Date(ev.date).toLocaleDateString()})
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={saving || !eventId}
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-black/90 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save Attendance"}
        </button>
      </div>

      {props.members.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-600">
          Add members first.
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50">
            <tr className="text-left text-slate-700">
              <th className="px-4 py-3 font-medium">Member</th>
              <th className="px-4 py-3 font-medium">Present</th>
              <th className="px-4 py-3 font-medium">Absent</th>
            </tr>
          </thead>
          <tbody>
            {props.members.map((m) => {
              const current = statuses[m.id] ?? "ABSENT";
              return (
                <tr key={m.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium">
                    {m.firstName} {m.lastName}
                  </td>
                  <td className="px-4 py-3">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="radio"
                        name={`status-${m.id}`}
                        checked={current === "PRESENT"}
                        onChange={() =>
                          setStatuses((prev) => ({
                            ...prev,
                            [m.id]: "PRESENT",
                          }))
                        }
                      />
                      <span className="text-slate-700">Present</span>
                    </label>
                  </td>
                  <td className="px-4 py-3">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="radio"
                        name={`status-${m.id}`}
                        checked={current === "ABSENT"}
                        onChange={() =>
                          setStatuses((prev) => ({
                            ...prev,
                            [m.id]: "ABSENT",
                          }))
                        }
                      />
                      <span className="text-slate-700">Absent</span>
                    </label>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {message ? (
        <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">
          {message}
        </div>
      ) : null}
    </form>
  );
}

