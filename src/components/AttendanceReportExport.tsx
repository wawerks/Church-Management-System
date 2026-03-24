"use client";

import { useEffect, useMemo, useState } from "react";
import { InlineSpinner } from "@/components/form-buttons";

type EventRow = { id: string; title: string; date: string | Date };

function toDateInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function AttendanceReportExport(props: {
  events: EventRow[];
  canExport?: boolean;
}) {
  const canExport = props.canExport !== false;
  const today = useMemo(() => new Date(), []);
  const defaultFrom = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() - 30);
    return d;
  }, [today]);

  const [eventId, setEventId] = useState<string>(""); // empty = range
  const [from, setFrom] = useState(() => toDateInputValue(defaultFrom));
  const [to, setTo] = useState(() => toDateInputValue(today));
  const [downloading, setDownloading] = useState<
    null | "xlsx" | "pdf" | "docx"
  >(null);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    averagePercent: number;
    rows: Array<{
      eventId: string;
      title: string;
      date: string;
      presentCount: number;
      totalMembers: number;
      percent: number;
    }>;
  } | null>(null);

  function download(format: "xlsx" | "pdf" | "docx") {
    if (downloading) return;
    setDownloading(format);
    const url = new URL(
      "/api/reports/attendance",
      window.location.origin,
    );
    url.searchParams.set("format", format);
    url.searchParams.set("from", from);
    url.searchParams.set("to", to);
    if (eventId) url.searchParams.set("eventId", eventId);
    window.location.href = url.toString();
    window.setTimeout(() => setDownloading(null), 5000);
  }

  const busy = downloading !== null;

  useEffect(() => {
    const controller = new AbortController();

    const loadPreview = async () => {
      try {
        setPreviewLoading(true);
        setPreviewError(null);

        const url = new URL("/api/reports/attendance/preview", window.location.origin);
        url.searchParams.set("from", from);
        url.searchParams.set("to", to);
        if (eventId) url.searchParams.set("eventId", eventId);

        const res = await fetch(url.toString(), {
          signal: controller.signal,
          cache: "no-store",
        });
        const data = (await res.json().catch(() => null)) as
          | {
              ok?: boolean;
              message?: string;
              averagePercent?: number;
              rows?: Array<{
                eventId: string;
                title: string;
                date: string;
                presentCount: number;
                totalMembers: number;
                percent: number;
              }>;
            }
          | null;

        if (!res.ok || !data?.ok) {
          setPreviewError(data?.message ?? "Unable to load preview.");
          setPreview(null);
          return;
        }

        setPreview({
          averagePercent: data.averagePercent ?? 0,
          rows: data.rows ?? [],
        });
      } catch {
        if (!controller.signal.aborted) {
          setPreviewError("Unable to load preview.");
          setPreview(null);
        }
      } finally {
        if (!controller.signal.aborted) setPreviewLoading(false);
      }
    };

    void loadPreview();
    return () => controller.abort();
  }, [eventId, from, to]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="grid gap-3 md:grid-cols-3 md:gap-4">
            <label className="block">
              <div className="mb-1 text-sm font-medium text-slate-700">
                Event (optional)
              </div>
              <select
                value={eventId}
                disabled={busy}
                onChange={(e) => setEventId(e.target.value)}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm disabled:opacity-60"
              >
                <option value="">All events in range</option>
                {props.events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <div className="mb-1 text-sm font-medium text-slate-700">From</div>
              <input
                type="date"
                value={from}
                disabled={busy}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm disabled:opacity-60"
              />
            </label>

            <label className="block">
              <div className="mb-1 text-sm font-medium text-slate-700">To</div>
              <input
                type="date"
                value={to}
                disabled={busy}
                onChange={(e) => setTo(e.target.value)}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm disabled:opacity-60"
              />
            </label>
          </div>

          <div className="flex flex-col gap-2">
            {canExport ? (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  aria-busy={downloading === "xlsx"}
                  onClick={() => download("xlsx")}
                  className="rounded-md bg-black px-3 py-2 text-sm font-medium text-white hover:bg-black/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {downloading === "xlsx" ? (
                    <span className="inline-flex items-center gap-2">
                      <InlineSpinner />
                      Preparing…
                    </span>
                  ) : (
                    "Download Excel"
                  )}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  aria-busy={downloading === "pdf"}
                  onClick={() => download("pdf")}
                  className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {downloading === "pdf" ? (
                    <span className="inline-flex items-center gap-2">
                      <InlineSpinner />
                      Preparing…
                    </span>
                  ) : (
                    "Download PDF"
                  )}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  aria-busy={downloading === "docx"}
                  onClick={() => download("docx")}
                  className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {downloading === "docx" ? (
                    <span className="inline-flex items-center gap-2">
                      <InlineSpinner />
                      Preparing…
                    </span>
                  ) : (
                    "Download Word"
                  )}
                </button>
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                Your role can view this page but cannot download exports.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div className="text-sm font-semibold text-slate-800">Preview</div>
          <div className="text-sm text-slate-600">
            Average attendance:{" "}
            <span className="font-semibold text-slate-800">
              {preview ? `${preview.averagePercent.toFixed(1)}%` : "—"}
            </span>
          </div>
        </div>

        {previewLoading ? (
          <div className="flex items-center gap-2 px-4 py-6 text-sm text-slate-600">
            <InlineSpinner />
            Loading preview...
          </div>
        ) : previewError ? (
          <div className="px-4 py-6 text-sm text-amber-700">{previewError}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left text-slate-700">
                  <th className="px-4 py-3 font-medium">Event</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Present</th>
                  <th className="px-4 py-3 font-medium">Total Members</th>
                  <th className="px-4 py-3 font-medium">Percent</th>
                </tr>
              </thead>
              <tbody>
                {preview && preview.rows.length > 0 ? (
                  preview.rows.map((r) => (
                    <tr key={r.eventId} className="border-t border-slate-100">
                      <td className="px-4 py-3">{r.title}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {new Date(r.date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">{r.presentCount}</td>
                      <td className="px-4 py-3">{r.totalMembers}</td>
                      <td className="px-4 py-3 font-semibold">
                        {r.percent.toFixed(1)}%
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-6 text-center text-slate-500"
                    >
                      No attendance data found for the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

