"use client";

import { useState } from "react";
import { createEventAction } from "../app/(protected)/events/actions";
import { SubmitButton } from "./form-buttons";

export function AddEventModal() {
  type ModalState = "closed" | "opening" | "open" | "closing";
  const [modalState, setModalState] = useState<ModalState>("closed");

  // Keep inputs controlled so the modal can reset cleanly.
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");

  function reset() {
    setTitle("");
    setDescription("");
    setDate("");
  }

  function openModal() {
    reset();
    setModalState("opening");
    // Let the opening styles apply before transitioning to the "open" state.
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
        onClick={() => {
          openModal();
        }}
        className="rounded-md bg-black px-3 py-2 text-sm font-medium text-white hover:bg-black/90"
      >
        + Add Event
      </button>

      {isMounted ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Add Event"
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
                  Add event
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Create a service date/event for attendance tracking.
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
              action={createEventAction}
              className="mt-4 space-y-5"
            >
              <label className="block">
                <div className="mb-1 text-sm font-medium text-slate-700">
                  Title
                </div>
                <input
                  name="title"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                  placeholder="e.g., Sunday Service"
                />
              </label>

              <label className="block">
                <div className="mb-1 text-sm font-medium text-slate-700">
                  Description (optional)
                </div>
                <textarea
                  name="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[90px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                  placeholder="Optional notes for staff"
                />
              </label>

              <label className="block">
                <div className="mb-1 text-sm font-medium text-slate-700">
                  Date
                </div>
                <input
                  name="date"
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                />
              </label>

              <div className="flex justify-end pt-2">
                <SubmitButton
                  pendingLabel="Saving…"
                  className="rounded-md bg-black px-3 py-2 text-sm font-medium text-white hover:bg-black/90"
                >
                  Save Event
                </SubmitButton>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

