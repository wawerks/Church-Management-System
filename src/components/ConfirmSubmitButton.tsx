"use client";

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { InlineSpinner } from "@/components/form-buttons";

type ConfirmSubmitButtonProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "type"
> & {
  confirmMessage?: string;
  pendingLabel?: string;
};

export function ConfirmSubmitButton({
  children,
  confirmMessage = "Save changes?",
  pendingLabel = "Saving…",
  className = "",
  disabled,
  ...rest
}: ConfirmSubmitButtonProps) {
  const { pending } = useFormStatus();
  const isBusy = Boolean(pending || disabled);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const confirmModal = confirmOpen ? (
    <>
      <div className="fixed inset-0 z-[200] bg-black/40" />
      <div className="fixed inset-0 z-[210] flex items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-5 shadow-lg">
          <h3 className="text-base font-semibold text-slate-900">Confirm save</h3>
          <p className="mt-2 text-sm text-slate-600">{confirmMessage}</p>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirmOpen(false);
                buttonRef.current?.form?.requestSubmit();
              }}
              className="rounded-md bg-black px-3 py-2 text-sm font-medium text-white hover:bg-black/90"
            >
              Proceed
            </button>
          </div>
        </div>
      </div>
    </>
  ) : null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        {...rest}
        disabled={isBusy}
        aria-busy={pending}
        onClick={() => setConfirmOpen(true)}
        className={`${className} active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 disabled:cursor-not-allowed disabled:opacity-60`.trim()}
      >
        {pending ? (
          <span className="inline-flex items-center justify-center gap-2">
            <InlineSpinner />
            <span>{pendingLabel}</span>
          </span>
        ) : (
          children
        )}
      </button>
      {confirmModal}
    </>
  );
}

