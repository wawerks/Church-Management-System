"use client";

import { useState } from "react";
import { createServiceIncomeAction } from "../app/(protected)/tithes-offering/actions";
import { SubmitButton } from "./form-buttons";

export function AddServiceIncomeModal() {
  type ModalState = "closed" | "opening" | "open" | "closing";
  const [modalState, setModalState] = useState<ModalState>("closed");

  const [serviceDate, setServiceDate] = useState("");
  const [amount, setAmount] = useState("");

  function reset() {
    setServiceDate("");
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
      >
        + Add Service Income
      </button>

      {isMounted ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Add Service Income"
        >
          <div
            className={`fixed inset-0 bg-black/40 transition-opacity duration-180 ease-out ${overlayClassName}`}
            onClick={closeModal}
          />

          <div
            className={`relative w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-lg transition-all duration-180 ease-out ${panelClassName}`}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Add service income
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Record the total income for a Sunday service date.
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

            <form
              action={createServiceIncomeAction}
              className="mt-4 space-y-5"
            >
              <label className="block">
                <div className="mb-1 text-sm font-medium text-slate-700">
                  Sunday Service Date
                </div>
                <input
                  name="serviceDate"
                  type="date"
                  required
                  value={serviceDate}
                  onChange={(e) => setServiceDate(e.target.value)}
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                />
              </label>

              <label className="block">
                <div className="mb-1 text-sm font-medium text-slate-700">
                  Total Tithes & Offering
                </div>
                <input
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
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
                  className="rounded-md bg-black px-3 py-2 text-sm font-medium text-white hover:bg-black/90"
                >
                  Save
                </SubmitButton>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

