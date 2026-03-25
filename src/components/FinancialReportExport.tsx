"use client";

import { useEffect, useMemo, useState } from "react";
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
  const [previewLoading, setPreviewLoading] = useState(true);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    incomeRows: Array<{
      period: string;
      tithesOffering: number;
      donations: number;
      totalIncome: number;
    }>;
    expenseRows: Array<{ type: string; receivedBy: string; amount: number }>;
    totals: {
      totalTithesOffering: number;
      totalDonations: number;
      totalExpenses: number;
      totalIncome: number;
      netRemaining: number;
    };
  } | null>(null);

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

  useEffect(() => {
    const controller = new AbortController();

    const loadPreview = async () => {
      try {
        setPreviewLoading(true);
        setPreviewError(null);

        const url = new URL("/api/reports/financial/preview", window.location.origin);
        url.searchParams.set("groupBy", groupBy);
        url.searchParams.set("from", from);
        url.searchParams.set("to", to);

        const res = await fetch(url.toString(), {
          signal: controller.signal,
          cache: "no-store",
        });
        const data = (await res.json().catch(() => null)) as
          | {
              ok?: boolean;
              message?: string;
              incomeRows?: Array<{
                period: string;
                tithesOffering: number;
                donations: number;
                totalIncome: number;
              }>;
              expenseRows?: Array<{
                type: string;
                receivedBy?: string;
                amount: number;
              }>;
              totals?: {
                totalTithesOffering: number;
                totalDonations: number;
                totalExpenses: number;
                totalIncome: number;
                netRemaining: number;
              };
            }
          | null;

        if (!res.ok || !data?.ok) {
          setPreviewError(data?.message ?? "Unable to load preview.");
          setPreview(null);
          return;
        }

        setPreview({
          incomeRows: data.incomeRows ?? [],
          expenseRows: (data.expenseRows ?? []).map((row) => ({
            type: row.type,
            receivedBy: row.receivedBy ?? "Unknown",
            amount: row.amount,
          })),
          totals: data.totals ?? {
            totalTithesOffering: 0,
            totalDonations: 0,
            totalExpenses: 0,
            totalIncome: 0,
            netRemaining: 0,
          },
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
  }, [groupBy, from, to]);

  function fmtMoney(value: number) {
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  return (
    <div className="space-y-4">
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

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3">
          <div className="text-sm font-semibold text-slate-800">
            Financial Preview
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
          <div className="space-y-4 p-4">
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-left text-slate-700">
                    <th className="px-4 py-3 font-medium">Period</th>
                    <th className="px-4 py-3 font-medium">Tithes & Offering</th>
                    <th className="px-4 py-3 font-medium">Donations</th>
                    <th className="px-4 py-3 font-medium">Total Income</th>
                  </tr>
                </thead>
                <tbody>
                  {preview && preview.incomeRows.length > 0 ? (
                    preview.incomeRows.map((r) => (
                      <tr key={r.period} className="border-t border-slate-100">
                        <td className="px-4 py-3 font-medium">{r.period}</td>
                        <td className="px-4 py-3">{fmtMoney(r.tithesOffering)}</td>
                        <td className="px-4 py-3">{fmtMoney(r.donations)}</td>
                        <td className="px-4 py-3 font-semibold">{fmtMoney(r.totalIncome)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                        No income data for selected filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-left text-slate-700">
                    <th className="px-4 py-3 font-medium">Expenses Type</th>
                    <th className="px-4 py-3 font-medium">Received By</th>
                    <th className="px-4 py-3 font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {preview && preview.expenseRows.length > 0 ? (
                    preview.expenseRows.map((r) => (
                      <tr
                        key={`${r.type}\0${r.receivedBy}`}
                        className="border-t border-slate-100"
                      >
                        <td className="px-4 py-3">{r.type}</td>
                        <td className="px-4 py-3">{r.receivedBy}</td>
                        <td className="px-4 py-3 font-semibold">{fmtMoney(r.amount)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="px-4 py-6 text-center text-slate-500">
                        No expenses data for selected filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {preview ? (
              <div className="grid gap-2 text-sm md:grid-cols-2">
                <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                  Overall Tithes & Offering:{" "}
                  <span className="font-semibold">{fmtMoney(preview.totals.totalTithesOffering)}</span>
                </div>
                <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                  Overall Donations:{" "}
                  <span className="font-semibold">{fmtMoney(preview.totals.totalDonations)}</span>
                </div>
                <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                  Total Expenses:{" "}
                  <span className="font-semibold">{fmtMoney(preview.totals.totalExpenses)}</span>
                </div>
                <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                  Cash Remain:{" "}
                  <span className="font-semibold">{fmtMoney(preview.totals.netRemaining)}</span>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

