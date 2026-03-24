"use client";

import { useMemo, useState } from "react";
import { InlineSpinner } from "@/components/form-buttons";

function toDateInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function FinancialReportExport(props: { canExport?: boolean }) {
  const canExport = props.canExport !== false;
  const today = useMemo(() => new Date(), []);

  const [groupBy, setGroupBy] = useState<"daily" | "monthly" | "yearly">(
    "monthly",
  );
  const [from, setFrom] = useState(() => {
    const d = new Date(today);
    d.setDate(1);
    return toDateInputValue(d);
  });
  const [to, setTo] = useState(() => toDateInputValue(today));
  const [downloading, setDownloading] = useState<
    null | "xlsx" | "pdf" | "docx"
  >(null);

  function download(format: "xlsx" | "pdf" | "docx") {
    if (downloading) return;
    setDownloading(format);
    const url = new URL(
      "/api/reports/financial",
      window.location.origin,
    );
    url.searchParams.set("format", format);
    url.searchParams.set("groupBy", groupBy);
    url.searchParams.set("from", from);
    url.searchParams.set("to", to);
    window.location.href = url.toString();
    window.setTimeout(() => setDownloading(null), 5000);
  }

  const busy = downloading !== null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="grid gap-3 md:grid-cols-3 md:gap-4">
          <label className="block">
            <div className="mb-1 text-sm font-medium text-slate-700">
              Report Period
            </div>
            <select
              value={groupBy}
              disabled={busy}
              onChange={(e) =>
                setGroupBy(e.target.value as "daily" | "monthly" | "yearly")
              }
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm disabled:opacity-60"
            >
              <option value="daily">Daily</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
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
  );
}

