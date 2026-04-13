"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { Role } from "@/generated/prisma/enums";
import { EditUserForm } from "@/app/(protected)/users/[id]/edit/EditUserForm";

export function EditUserModal({
  open,
  onClose,
  userId,
  isSelf,
  defaultName,
  defaultRole,
  email,
  defaultPhoneNumber,
  defaultAddress,
  defaultBirthdateInput,
}: {
  open: boolean;
  onClose: () => void;
  userId: string;
  isSelf: boolean;
  defaultName: string;
  defaultRole: Role;
  email: string;
  defaultPhoneNumber: string | null;
  defaultAddress: string | null;
  defaultBirthdateInput: string | null; // YYYY-MM-DD or ISO or null
}) {
  type ModalState = "closed" | "closing" | "open";
  const [modalState, setModalState] = useState<ModalState>("closed");
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPortalRoot(document.body);
  }, []);

  useEffect(() => {
    if (open) {
      setModalState("open");
      return;
    }
    if (!open && modalState === "open") {
      setModalState("closing");
      window.setTimeout(() => setModalState("closed"), 180);
    }
  }, [open, modalState]);

  if (modalState === "closed" || !portalRoot) return null;

  const birthdateDate =
    defaultBirthdateInput && typeof defaultBirthdateInput === "string"
      ? new Date(defaultBirthdateInput)
      : null;

  return createPortal(
    <div
      className="fixed inset-y-0 left-0 right-0 z-[220] overflow-y-auto md:left-72"
      role="dialog"
      aria-modal="true"
      aria-label="Edit user"
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
            "relative mx-auto w-full max-w-4xl rounded-xl border border-slate-200 bg-white shadow-lg",
            "max-h-[calc(100vh-2rem)] overflow-y-auto p-5 md:p-6",
            modalState === "closing"
              ? "translate-y-2 scale-[0.98] opacity-0 transition-all duration-180"
              : "translate-y-0 scale-100 opacity-100 transition-all duration-180",
          ].join(" ")}
        >
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Edit user
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Update display name and role.
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

          <EditUserForm
            userId={userId}
            isSelf={isSelf}
            defaultName={defaultName}
            defaultRole={defaultRole}
            email={email}
            defaultPhoneNumber={defaultPhoneNumber}
            defaultAddress={defaultAddress}
            defaultBirthdate={birthdateDate}
          />
        </div>
      </div>
    </div>,
    portalRoot
  );
}

