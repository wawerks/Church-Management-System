"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  deleteExpenseTypeAction,
  updateExpenseTypesBulkConfigAction,
} from "@/app/(protected)/expenses/types/actions";
import { SubmitButton } from "@/components/form-buttons";
import { DeleteSubmitButton } from "@/components/form-buttons";

type Row = {
  id: string;
  name: string;
  allocationPercent: number;
  isAllocatedFromServiceIncome: boolean;
};

function formatPct(n: number) {
  if (!Number.isFinite(n)) return "0.00";
  return n.toFixed(2);
}

function digitsOnly(s: string) {
  return s.replace(/\D/g, "");
}

function sanitizeDigits(rawDigits: string) {
  const digits = rawDigits;
  if (!digits) return "";
  if (/^0+$/.test(digits)) return "";
  if (digits.startsWith("100")) return digits.slice(0, 5); // 100.00
  return digits.slice(0, 4); // II.FF => 2 digits integer + 2 decimals
}

function displayFromDigits(digits: string) {
  if (!digits) return "";
  // Treat "0.00" round-trips (internal "0000") as empty so it doesn't block input.
  if (/^0+$/.test(digits)) return "";
  // Literal 100.00%+ uses 5 digits ("10000"); 4-digit "1000" is II.FF => 10.00% — do not mix them.
  if (digits.startsWith("100") && digits.length >= 5) {
    const decimals = digits.slice(3, 5);
    return `100.${decimals.padEnd(2, "0").slice(0, 2)}`;
  }

  if (digits.length === 1) return digits;
  if (digits.length === 2) return `${digits}.`;
  if (digits.length === 3) return `${digits.slice(0, 2)}.${digits[2]}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 4)}`;
}

function percentFromDigits(digits: string) {
  if (!digits) return 0;

  if (digits.startsWith("100") && digits.length >= 5) {
    const decimals = digits.slice(3, 5).padEnd(2, "0");
    return 100 + Number(decimals) / 100;
  }

  if (digits.length <= 2) return Number(digits);
  const intPart = digits.slice(0, 2);
  const decimals = digits.slice(2, 4).padEnd(2, "0");
  return Number(intPart) + Number(decimals) / 100;
}

function digitCountBeforeIndex(displayValue: string, idx: number) {
  const left = displayValue.slice(0, idx);
  const m = left.match(/\d/g);
  return m ? m.length : 0;
}

function indexForDigitCount(displayValue: string, digitCount: number) {
  if (digitCount <= 0) return 0;
  let count = 0;
  for (let i = 0; i < displayValue.length; i++) {
    if (/\d/.test(displayValue[i])) count++;
    if (count === digitCount) return i + 1;
  }
  return displayValue.length;
}

type DraftRow = Omit<Row, "allocationPercent"> & {
  allocationPercentDigits: string;
};

function allocationPercentToDigits(percent: number): string {
  if (!Number.isFinite(percent) || percent <= 0) {
    return "";
  }
  if (percent >= 100) {
    return "10000";
  }

  const intPart = Math.floor(percent);
  let frac = Math.round((percent - intPart) * 100);
  let finalInt = intPart;
  if (frac >= 100) {
    finalInt = intPart + 1;
    frac = 0;
  }
  if (finalInt >= 100) {
    return "10000";
  }

  const intDigits = String(finalInt).padStart(2, "0");
  const fracDigits = String(frac).padStart(2, "0");
  const digits = `${intDigits}${fracDigits}`.slice(0, 4);
  return /^0+$/.test(digits) ? "" : digits;
}

function buildDraftFromRows(rows: Row[]): DraftRow[] {
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    isAllocatedFromServiceIncome: r.isAllocatedFromServiceIncome,
    allocationPercentDigits: allocationPercentToDigits(
      Number(r.allocationPercent),
    ),
  }));
}

export function ExpenseTypeAllocationEditor({ rows }: { rows: Row[] }) {
  const [isEditing, setIsEditing] = useState(false);
  const [focusedRowId, setFocusedRowId] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    open: boolean;
    top: number;
    left: number;
    visible: boolean;
  }>({ open: false, top: 0, left: 0, visible: false });
  const toastTimeoutRef = useRef<number | null>(null);
  const toastHideTimeoutRef = useRef<number | null>(null);

  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const [draft, setDraft] = useState<DraftRow[]>(() =>
    buildDraftFromRows(rows),
  );

  const rowsSignature = useMemo(
    () =>
      JSON.stringify(
        [...rows]
          .sort((a, b) => a.id.localeCompare(b.id))
          .map((r) => ({
            id: r.id,
            name: r.name,
            allocationPercent: r.allocationPercent,
            isAllocatedFromServiceIncome: r.isAllocatedFromServiceIncome,
          })),
      ),
    [rows],
  );

  useEffect(() => {
    if (isEditing) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(buildDraftFromRows(rows));
    // `rows` omitted from deps: encoded by rowsSignature; RSC often passes a new array ref each render.
  }, [rowsSignature, isEditing]);

  const allocatedTotal = useMemo(() => {
    return draft
      .filter((r) => r.isAllocatedFromServiceIncome)
      .reduce((sum, r) => sum + percentFromDigits(r.allocationPercentDigits), 0);
  }, [draft]);

  const isAllocationValid = Math.abs(allocatedTotal - 100) < 0.0001;

  function showInvalidAllocationToast() {
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = null;
    }
    if (toastHideTimeoutRef.current) {
      window.clearTimeout(toastHideTimeoutRef.current);
      toastHideTimeoutRef.current = null;
    }

    const anchor = document.getElementById("expense-types-add-type");
    if (anchor) {
      const rect = anchor.getBoundingClientRect();
      setToast({
        open: true,
        top: rect.bottom + 8,
        left: rect.left,
        visible: true,
      });
    } else {
      setToast({ open: true, top: 90, left: 20, visible: true });
    }

    toastTimeoutRef.current = window.setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
      toastHideTimeoutRef.current = window.setTimeout(() => {
        setToast((prev) => ({ ...prev, open: false }));
      }, 180);
    }, 3000);
  }

  function resetDraft() {
    setDraft(buildDraftFromRows(rows));
  }

  const payload = useMemo(
    () =>
      draft.map((r) => ({
        id: r.id,
        allocationPercent: percentFromDigits(r.allocationPercentDigits),
        isAllocatedFromServiceIncome: r.isAllocatedFromServiceIncome,
      })),
    [draft],
  );

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
        <div
          className={`rounded-lg border px-3 py-2 text-sm ${
            isAllocationValid
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-amber-200 bg-amber-50 text-amber-900"
          }`}
        >
          Allocated total: <span className="font-semibold">{allocatedTotal.toFixed(2)}%</span>{" "}
          (required: 100.00%)
          {!isAllocationValid ? (
            <div className="mt-1">
              Allocation percentages for enabled expense types must equal exactly 100%.
            </div>
          ) : null}
        </div>

        {toast.open ? (
          <div
            role="alert"
            aria-live="assertive"
            className={`fixed z-[300] rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-lg transition-all duration-180 ease-out ${
              toast.visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1"
            }`}
            style={{ top: toast.top, left: toast.left }}
          >
            The total allocation percentages do not meet 100%.
          </div>
        ) : null}

        <div className="flex items-center gap-2">
          {!isEditing ? (
            <button
              type="button"
              onClick={() => {
                resetDraft();
                setIsEditing(true);
              }}
              className="rounded-md bg-black px-3 py-2 text-sm font-medium text-white hover:bg-black/90"
              disabled={rows.length === 0}
            >
              Edit
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  resetDraft();
                  setIsEditing(false);
                }}
                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <form
                action={updateExpenseTypesBulkConfigAction}
                className="inline-flex"
                onSubmit={(e) => {
                  if (!isAllocationValid) {
                    e.preventDefault();
                    showInvalidAllocationToast();
                  }
                }}
              >
                <input type="hidden" name="payload" value={JSON.stringify(payload)} />
                <SubmitButton
                  pendingLabel="Saving..."
                  className="rounded-md bg-black px-3 py-2 text-sm font-medium text-white hover:bg-black/90"
                >
                  Save all
                </SubmitButton>
              </form>
            </>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50">
            <tr className="text-left text-slate-700">
              <th className="px-4 py-3 font-medium">Type Name</th>
              <th className="px-4 py-3 font-medium">Include in Allocation</th>
              <th className="px-4 py-3 font-medium">Allocation %</th>
              <th className="px-4 py-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {draft.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                  No expense types yet.
                </td>
              </tr>
            ) : (
              draft.map((r, idx) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">{r.name}</td>
                  <td className="px-4 py-3">
                    <label className="inline-flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={r.isAllocatedFromServiceIncome}
                        disabled={!isEditing}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setDraft((prev) => {
                            const next = [...prev];
                            next[idx] = { ...next[idx], isAllocatedFromServiceIncome: checked };
                            return next;
                          });
                        }}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                      <span className="text-slate-700">Enabled</span>
                    </label>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {isEditing ? (
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder={focusedRowId === r.id ? "" : "0.00"}
                          value={displayFromDigits(r.allocationPercentDigits)}
                          ref={(el) => {
                            inputRefs.current[r.id] = el;
                          }}
                          onPointerDown={() => {
                            setFocusedRowId(r.id);
                            // If the DB rounding produced "0.00" (internal digits "0000"),
                            // clear it on click so it behaves like a placeholder sample.
                            if (r.allocationPercentDigits && /^0+$/.test(r.allocationPercentDigits)) {
                              setDraft((prev) => {
                                const next = [...prev];
                                next[idx] = { ...next[idx], allocationPercentDigits: "" };
                                return next;
                              });
                            }
                          }}
                          onBlur={() =>
                            setFocusedRowId((prev) => (prev === r.id ? null : prev))
                          }
                          onChange={(e) => {
                            const inputEl = e.currentTarget;
                            const selectionStart =
                              inputEl.selectionStart ?? inputEl.value.length;

                            const rawDigits = digitsOnly(inputEl.value);
                          const nextDigits = sanitizeDigits(rawDigits);

                            const nextDisplay = displayFromDigits(nextDigits);
                            const digitCaretIndex = digitCountBeforeIndex(
                              inputEl.value,
                              selectionStart,
                            );
                            const nextCaretPos = indexForDigitCount(
                              nextDisplay,
                              digitCaretIndex,
                            );

                            setDraft((prev) => {
                              const next = [...prev];
                              next[idx] = {
                                ...next[idx],
                                allocationPercentDigits: nextDigits,
                              };
                              return next;
                            });

                            window.setTimeout(() => {
                              const input = inputRefs.current[r.id];
                              if (!input) return;
                              try {
                                input.setSelectionRange(
                                  nextCaretPos,
                                  nextCaretPos,
                                );
                              } catch {
                                // ignore
                              }
                            }, 0);
                          }}
                          className="w-28 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm"
                        />
                      ) : (
                        <div className="w-28 rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm text-slate-700">
                          {r.allocationPercentDigits && !/^0+$/.test(r.allocationPercentDigits)
                            ? formatPct(percentFromDigits(r.allocationPercentDigits))
                            : "0.00"}
                        </div>
                      )}
                      <span className="text-slate-500">%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <form action={deleteExpenseTypeAction.bind(null, r.id)}>
                      <DeleteSubmitButton />
                    </form>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

