"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { SubmitButton } from "./form-buttons";
import { updateSelfProfileAction } from "../app/(protected)/profile/actions";

export function EditProfileModal({
  open,
  onClose,
  userId,
  name,
  email,
  phoneNumber,
  address,
  birthdateInput,
}: {
  open: boolean;
  onClose: () => void;
  userId: string;
  name: string;
  email: string;
  phoneNumber: string | null;
  address: string | null;
  birthdateInput: string; // YYYY-MM-DD
}) {
  type ModalState = "closed" | "closing" | "open";
  const [modalState, setModalState] = useState<ModalState>("closed");
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);

  const [localName, setLocalName] = useState(name);
  const [localPhone, setLocalPhone] = useState(phoneNumber ?? "");
  const [localAddress, setLocalAddress] = useState(address ?? "");
  const [localBirthdate, setLocalBirthdate] = useState(birthdateInput);

  useEffect(() => {
    setPortalRoot(document.body);
  }, []);

  useEffect(() => {
    if (open) {
      setLocalName(name);
      setLocalPhone(phoneNumber ?? "");
      setLocalAddress(address ?? "");
      setLocalBirthdate(birthdateInput);
      setModalState("open");
    } else if (modalState === "open") {
      setModalState("closing");
      window.setTimeout(() => setModalState("closed"), 180);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const isMounted = modalState !== "closed";

  if (!isMounted || !portalRoot) return null;

  return createPortal(
    <div
      className="fixed inset-y-0 left-0 right-0 z-[210] overflow-y-auto md:left-72"
      role="dialog"
      aria-modal="true"
      aria-label="Edit profile"
    >
      <div
        className="fixed inset-y-0 left-0 right-0 bg-black/40 backdrop-blur-[1px] md:left-72"
        onClick={() => {
          onClose();
        }}
      />
      <div className="flex min-h-full w-full items-center justify-center p-4">
        <div
          className={[
            "relative mx-auto w-full max-w-3xl max-h-[calc(100vh-2rem)] overflow-y-auto rounded-xl border border-slate-200 bg-white p-8 shadow-lg",
            modalState === "closing" ? "translate-y-2 scale-[0.98] opacity-0 transition-all duration-180" : "",
            modalState === "open" ? "opacity-100 translate-y-0 scale-100 transition-all duration-0" : "",
          ].join(" ")}
        >
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Edit profile
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Update your account details.
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

        <form
          action={updateSelfProfileAction.bind(null, userId)}
          className="space-y-5"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <div className="mb-1 text-sm font-medium text-slate-700">Name</div>
              <input
                name="name"
                required
                value={localName}
                onChange={(e) => setLocalName(e.target.value)}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </label>

            <div>
              <div className="mb-1 text-sm font-medium text-slate-700">Email</div>
              <div className="rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                {email}
              </div>
            </div>

            <label className="block">
              <div className="mb-1 text-sm font-medium text-slate-700">Phone</div>
              <input
                name="phoneNumber"
                value={localPhone}
                onChange={(e) => setLocalPhone(e.target.value)}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                placeholder="Optional"
              />
            </label>

            <label className="block">
              <div className="mb-1 text-sm font-medium text-slate-700">Birthday</div>
              <input
                name="birthdate"
                type="date"
                value={localBirthdate}
                onChange={(e) => setLocalBirthdate(e.target.value)}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </label>

            <div className="sm:col-span-2">
              <div className="mb-1 text-sm font-medium text-slate-700">Address</div>
              <input
                name="address"
                value={localAddress}
                onChange={(e) => setLocalAddress(e.target.value)}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                placeholder="Optional"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <SubmitButton
              pendingLabel="Saving…"
              className="rounded-md bg-black px-3 py-2 text-sm font-medium text-white hover:bg-black/90"
            >
              Save Changes
            </SubmitButton>
          </div>
        </form>
        </div>
      </div>
    </div>,
    portalRoot
  );
}

