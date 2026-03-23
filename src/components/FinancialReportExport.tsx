"use client";

import { useMemo, useState } from "react";

function toDateInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function FinancialReportExport() {
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

  function download(format: "xlsx" | "pdf" | "docx") {
    const url = new URL(
      "/api/reports/financial",
      window.location.origin,
    );
    url.searchParams.set("format", format);
    url.searchParams.set("groupBy", groupBy);
    url.searchParams.set("from", from);
    url.searchParams.set("to", to);
    window.location.href = url.toString();
  }

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
              onChange={(e) =>
                setGroupBy(e.target.value as "daily" | "monthly" | "yearly")
              }
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
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
              onChange={(e) => setFrom(e.target.value)}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            />
          </label>

          <label className="block">
            <div className="mb-1 text-sm font-medium text-slate-700">To</div>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => download("xlsx")}
            className="rounded-md bg-black px-3 py-2 text-sm font-medium text-white hover:bg-black/90"
          >
            Download Excel
          </button>
          <button
            type="button"
            onClick={() => download("pdf")}
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            Download PDF
          </button>
          <button
            type="button"
            onClick={() => download("docx")}
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            Download Word
          </button>
        </div>
      </div>
    </div>
  );
}

