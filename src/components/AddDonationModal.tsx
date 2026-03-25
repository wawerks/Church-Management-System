"use client";

import { useState } from "react";
import { createDonationAction } from "../app/(protected)/donations/actions";
import { SubmitButton } from "./form-buttons";

type MemberSuggestion = { id: string; name: string };

export function AddDonationModal({
  members,
}: {
  members: MemberSuggestion[];
}) {
  type ModalState = "closed" | "opening" | "open" | "closing";
  const [modalState, setModalState] = useState<ModalState>("closed");

  const [memberName, setMemberName] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"DONATION" | "OTHERS">("DONATION");
  const [date, setDate] = useState("");

  function reset() {
    setMemberName("");
    setAmount("");
    setType("DONATION");
    setDate("");
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
        + Add Donation
      </button>

      {isMounted ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Add Donation"
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
                  Add donation
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Record member donations separately from service income.
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
              action={createDonationAction}
              className="mt-4 space-y-5"
            >
              <label className="block">
                <div className="mb-1 text-sm font-medium text-slate-700">
                  Member / Donator
                </div>
                <input
                  name="memberName"
                  required
                  list="member-name-options"
                  placeholder="Search or type a name…"
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                  autoComplete="off"
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                />
                <datalist id="member-name-options">
                  {members.map((m) => (
                    <option key={m.id} value={m.name} />
                  ))}
                </datalist>
              </label>

              <div className="grid gap-4 md:grid-cols-2">
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

                <label className="block">
                  <div className="mb-1 text-sm font-medium text-slate-700">
                    Type
                  </div>
                  <select
                    name="type"
                    required
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                  >
                    <option value="DONATION">Donation</option>
                    <option value="OTHERS">Others</option>
                  </select>
                </label>
              </div>

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

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <SubmitButton
                  pendingLabel="Saving…"
                  className="rounded-md bg-black px-3 py-2 text-sm font-medium text-white hover:bg-black/90"
                >
                  Save Donation
                </SubmitButton>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

