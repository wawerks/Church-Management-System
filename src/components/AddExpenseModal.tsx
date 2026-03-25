"use client";

import { useState } from "react";
import { createExpenseAction } from "../app/(protected)/expenses/actions";
import { SubmitButton } from "./form-buttons";
import type { Role } from "@/generated/prisma/enums";

type ExpenseType = { id: string; name: string };

export function AddExpenseModal({
  expenseTypes,
  receivedBySuggestions,
}: {
  expenseTypes: ExpenseType[];
  receivedBySuggestions: string[];
}) {
  type ModalState = "closed" | "opening" | "open" | "closing";
  const [modalState, setModalState] = useState<ModalState>("closed");

  const [type, setType] = useState(expenseTypes[0]?.name ?? "");
  const [receivedBy, setReceivedBy] = useState("");
  const [date, setDate] = useState("");
  const [amount, setAmount] = useState("");

  function reset() {
    setType(expenseTypes[0]?.name ?? "");
    setReceivedBy("");
    setDate("");
    setAmount("");
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

      {isMounted ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Add Expense"
        >
          <div
            className={`fixed inset-0 bg-black/40 transition-opacity duration-180 ease-out ${overlayClassName}`}
            onClick={closeModal}
          />

          <div
            className={`relative w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-5 shadow-lg transition-all duration-180 ease-out ${panelClassName}`}
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
              <label className="block">
                <div className="mb-1 text-sm font-medium text-slate-700">
                  Expense Type
                </div>
                <select
                  name="type"
                  required
                  value={type}
                  onChange={(e) => setType(e.target.value)}
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
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>

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
      ) : null}
    </>
  );
}

