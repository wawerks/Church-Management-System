"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { createExpenseAction } from "../app/(protected)/expenses/actions";
import { SubmitButton } from "./form-buttons";

type ExpenseType = {
  id: string;
  name: string;
  allocationPercent: number;
  isAllocatedFromServiceIncome: boolean;
};

function getMonthKey(dateInput: string) {
  if (!dateInput) return "";
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function AddExpenseModal({
  expenseTypes,
  receivedBySuggestions,
  serviceIncomeTotalsByMonth,
  budgetMonth,
  spentByTypeForBudgetMonth,
}: {
  expenseTypes: ExpenseType[];
  receivedBySuggestions: string[];
  serviceIncomeTotalsByMonth: Record<string, number>;
  budgetMonth?: string; // Format: YYYY-MM (from the Expenses page Budget Month filter)
  spentByTypeForBudgetMonth?: Record<string, number>; // key: expense type name
}) {
  type ModalState = "closed" | "opening" | "open" | "closing";
  const [modalState, setModalState] = useState<ModalState>("closed");
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);

  const defaultDate = budgetMonth ? `${budgetMonth}-01` : "";

  const [type, setType] = useState(expenseTypes[0]?.name ?? "");
  const [receivedBy, setReceivedBy] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [amount, setAmount] = useState("");
  const [useSuggestedAmount, setUseSuggestedAmount] = useState(true);

  const selectedType = expenseTypes.find((t) => t.name === type);
  const monthKey = getMonthKey(date);
  const monthTotal = monthKey ? (serviceIncomeTotalsByMonth[monthKey] ?? 0) : 0;
  const suggestedAmount = (() => {
    if (!selectedType?.isAllocatedFromServiceIncome || !monthKey) return null;

    const computed = (monthTotal * selectedType.allocationPercent) / 100;
    if (!budgetMonth || monthKey !== budgetMonth) return computed > 0 ? computed : null;

    const spent = spentByTypeForBudgetMonth?.[selectedType.name] ?? 0;
    const remaining = computed - spent;
    return remaining > 0 ? remaining : null;
  })();
  const usingAutoCompute = Boolean(
    useSuggestedAmount && selectedType?.isAllocatedFromServiceIncome,
  );

  // When the modal opens with a pre-filled date (e.g. budget month),
  // immediately compute and populate the amount if auto-compute is enabled.
  useEffect(() => {
    if (!usingAutoCompute) return;
    if (suggestedAmount === null) {
      setAmount("");
      return;
    }
    setAmount(suggestedAmount.toFixed(2));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usingAutoCompute, suggestedAmount]);

  useEffect(() => {
    setPortalRoot(document.body);
  }, []);

  function reset() {
    setType(expenseTypes[0]?.name ?? "");
    setReceivedBy("");
    setDate(defaultDate);
    setAmount("");
    setUseSuggestedAmount(true);
  }

  function openModal() {
    reset();
    setModalState("opening");
    window.setTimeout(() => setModalState("open"), 20);
  }

  function closeModal() {
    if (modalState === "closed" || modalState === "closing") return;
    setModalState("closing");
    window.setTimeout(() => setModalState("closed"), 180);
  }

  const isMounted = modalState !== "closed";
  const overlayClassName =
    modalState === "open" ? "opacity-100" : "opacity-0";
  const panelClassName =
    modalState === "open"
      ? "translate-y-0 scale-100 opacity-100"
      : "translate-y-2 scale-95 opacity-0";

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="rounded-md bg-black px-3 py-2 text-sm font-medium text-white hover:bg-black/90"
        disabled={expenseTypes.length === 0}
      >
        + Add Expense
      </button>

      {isMounted && portalRoot ? createPortal(
        <div
          className="fixed inset-y-0 left-0 right-0 z-[200] overflow-y-auto md:left-72"
          role="dialog"
          aria-modal="true"
          aria-label="Add Expense"
        >
          <div
            className={`fixed inset-y-0 left-0 right-0 bg-black/40 backdrop-blur-[1px] transition-opacity duration-180 ease-out md:left-72 ${overlayClassName}`}
            onClick={closeModal}
          />
          <div className="flex min-h-full w-full items-start justify-center p-4 pt-25">
            <div
              className={`relative mx-auto w-full max-w-2xl max-h-[calc(100vh-3rem)] overflow-y-auto rounded-xl border border-slate-200 bg-white p-5 shadow-lg transition-all duration-180 ease-out ${panelClassName}`}
            >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Add expense
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Save an expense transaction with type, date, and amount.
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                X
              </button>
            </div>

            <form action={createExpenseAction} className="space-y-5">
              {budgetMonth ? (
                <input type="hidden" name="budgetMonth" value={budgetMonth} />
              ) : null}
              <label className="block">
                <div className="mb-1 text-sm font-medium text-slate-700">
                  Expense Type
                </div>
                <select
                  name="type"
                  required
                  value={type}
                  onChange={(e) => {
                    const nextType = e.target.value;
                    setType(nextType);
                    if (useSuggestedAmount) {
                      const nextSelected = expenseTypes.find((t) => t.name === nextType);
                      if (!nextSelected?.isAllocatedFromServiceIncome || !monthKey) {
                        setAmount("");
                        return;
                      }

                      const computed =
                        (monthTotal * nextSelected.allocationPercent) / 100;
                      if (!budgetMonth || monthKey !== budgetMonth) {
                        setAmount(computed > 0 ? computed.toFixed(2) : "");
                        return;
                      }

                      const spent =
                        spentByTypeForBudgetMonth?.[nextSelected.name] ?? 0;
                      const remaining = computed - spent;
                      setAmount(remaining > 0 ? remaining.toFixed(2) : "");
                    }
                  }}
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                  disabled={expenseTypes.length === 0}
                >
                  {expenseTypes.length === 0 ? (
                    <option value="" disabled>
                      No expense types available
                    </option>
                  ) : (
                    expenseTypes.map((t) => (
                      <option key={t.id} value={t.name}>
                        {t.name}
                      </option>
                    ))
                  )}
                </select>
              </label>

              <label className="block">
                <div className="mb-1 text-sm font-medium text-slate-700">
                  Received By
                </div>
                <input
                  name="receivedBy"
                  required
                  placeholder="Person who received the money"
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                  list="received-by-options"
                  autoComplete="off"
                  value={receivedBy}
                  onChange={(e) => setReceivedBy(e.target.value)}
                />
                <datalist id="received-by-options">
                  {receivedBySuggestions.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
              </label>

              <label className="block">
                <div className="mb-1 text-sm font-medium text-slate-700">
                  Date
                </div>
                <input
                  name="date"
                  type="date"
                  required
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                  value={date}
                  onChange={(e) => {
                    const nextDate = e.target.value;
                    setDate(nextDate);
                    if (useSuggestedAmount) {
                      const nextMonthKey = getMonthKey(nextDate);
                      const nextMonthTotal = nextMonthKey
                        ? (serviceIncomeTotalsByMonth[nextMonthKey] ?? 0)
                        : 0;

                      if (!selectedType?.isAllocatedFromServiceIncome || !nextMonthKey) {
                        setAmount("");
                        return;
                      }

                      const computed =
                        (nextMonthTotal * selectedType.allocationPercent) / 100;

                      if (!budgetMonth || nextMonthKey !== budgetMonth) {
                        setAmount(computed > 0 ? computed.toFixed(2) : "");
                        return;
                      }

                      const spent =
                        spentByTypeForBudgetMonth?.[selectedType.name] ?? 0;
                      const remaining = computed - spent;
                      setAmount(remaining > 0 ? remaining.toFixed(2) : "");
                    }
                  }}
                />
              </label>

              {selectedType?.isAllocatedFromServiceIncome ? (
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    name="useSuggestedAmount"
                    checked={useSuggestedAmount}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setUseSuggestedAmount(checked);
                      if (checked && suggestedAmount !== null) {
                        setAmount(suggestedAmount.toFixed(2));
                      }
                    }}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  Auto-compute amount from expense type allocation
                </label>
              ) : null}

              {selectedType?.isAllocatedFromServiceIncome ? (
                <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  {monthKey ? (
                    <>
                      Suggested amount:{" "}
                      <span className="font-semibold text-slate-900">
                        {suggestedAmount?.toFixed(2) ?? "0.00"}
                      </span>{" "}
                      ({selectedType.allocationPercent.toFixed(2)}% of {monthTotal.toFixed(2)} for{" "}
                      {monthKey})
                    </>
                  ) : (
                    <>Pick a date to preview the computed amount for that month.</>
                  )}
                </div>
              ) : null}

              <label className="block">
                <div className="mb-1 text-sm font-medium text-slate-700">
                  Amount
                </div>
                <input
                  name="amount"
                  required
                  type="number"
                  step="0.01"
                  min="0"
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  readOnly={usingAutoCompute}
                />
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <SubmitButton
                  pendingLabel="Saving..."
                  disabled={expenseTypes.length === 0}
                  className="rounded-md bg-black px-3 py-2 text-sm font-medium text-white hover:bg-black/90"
                >
                  Save Expense
                </SubmitButton>
              </div>
            </form>
            </div>
          </div>
        </div>,
        portalRoot
      ) : null}
    </>
  );
}

