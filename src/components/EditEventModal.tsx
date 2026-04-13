"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { updateEventAction } from "@/app/(protected)/events/actions";

export function EditEventModal({
  open,
  onClose,
  eventId,
  defaultTitle,
  defaultDescription,
  defaultDateInput,
}: {
  open: boolean;
  onClose: () => void;
  eventId: string;
  defaultTitle: string;
  defaultDescription: string | null;
  defaultDateInput: string;
}) {
  type ModalState = "closed" | "closing" | "open";
  const [modalState, setModalState] = useState<ModalState>("closed");
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);

  const [title, setTitle] = useState(defaultTitle);
  const [description, setDescription] = useState(defaultDescription ?? "");
  const [date, setDate] = useState(defaultDateInput);

  useEffect(() => {
    setPortalRoot(document.body);
  }, []);

  useEffect(() => {
    if (open) {
      setTitle(defaultTitle);
      setDescription(defaultDescription ?? "");
      setDate(defaultDateInput);
      setModalState("open");
      return;
    }
    if (!open && modalState === "open") {
      setModalState("closing");
      window.setTimeout(() => setModalState("closed"), 180);
    }
  }, [open, defaultTitle, defaultDescription, defaultDateInput, modalState]);

  if (modalState === "closed" || !portalRoot) return null;

  return createPortal(
    <div
      className="fixed inset-y-0 left-0 right-0 z-[220] overflow-y-auto md:left-72"
      role="dialog"
      aria-modal="true"
      aria-label="Edit event"
    >
      <div
        className="fixed inset-y-0 left-0 right-0 bg-black/40 backdrop-blur-[1px] md:left-72"
        onClick={onClose}
      />
      <div className="flex min-h-full w-full items-center justify-center p-4">
        <div
          className={[
            "relative mx-auto w-full max-w-3xl max-h-[calc(100vh-2rem)] overflow-y-auto rounded-xl border border-slate-200 bg-white p-5 shadow-lg md:p-6",
            modalState === "closing"
              ? "translate-y-2 scale-[0.98] opacity-0 transition-all duration-180"
              : "translate-y-0 scale-100 opacity-100 transition-all duration-180",
          ].join(" ")}
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Edit Event</h2>
              <p className="mt-1 text-sm text-slate-600">
                Update title/description and service date.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              X
            </button>
          </div>

          <form action={updateEventAction.bind(null, eventId)} className="space-y-5">
            <label className="block">
              <div className="mb-1 text-sm font-medium text-slate-700">Title</div>
              <input
                name="title"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </label>

            <label className="block">
              <div className="mb-1 text-sm font-medium text-slate-700">Description</div>
              <textarea
                name="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[90px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </label>

            <label className="block">
              <div className="mb-1 text-sm font-medium text-slate-700">Date</div>
              <input
                name="date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </label>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <ConfirmSubmitButton
                pendingLabel="Saving…"
                confirmMessage="Save changes to this event?"
                className="rounded-md bg-black px-3 py-2 text-sm font-medium text-white hover:bg-black/90"
              >
                Save Changes
              </ConfirmSubmitButton>
            </div>
          </form>
        </div>
      </div>
    </div>,
    portalRoot,
  );
}
