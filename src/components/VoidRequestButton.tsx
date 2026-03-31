"use client";

import { useActionState, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { InlineSpinner } from "@/components/form-buttons";

type VoidRequestFormState = { ok: boolean | null; error: string | null };

type VoidRequestButtonProps = {
  /** Server action compatible with `useFormState` (signature: (prevState, formData) => Promise<State>) */
  action: (prevState: VoidRequestFormState, formData: FormData) => Promise<VoidRequestFormState>;
  label?: string;
  reasonFieldName?: string;
  confirmTitle?: string;
  confirmDescription?: string;
  className?: string;
};

export function VoidRequestButton({
  action,
  label = "Request void",
  reasonFieldName = "voidReason",
  confirmTitle = "Submit void request",
  confirmDescription = "The record stays active until an administrator approves.",
  className = "",
}: VoidRequestButtonProps) {
  const router = useRouter();
  const initialState = useMemo<VoidRequestFormState>(
    () => ({ ok: null, error: null }),
    [],
  );
  const [serverState, formAction] = useActionState(action, initialState);

  const [modalMounted, setModalMounted] = useState(false);
  const [modalClosing, setModalClosing] = useState(false);
  const [reason, setReason] = useState("");
  const [openSessionId, setOpenSessionId] = useState(0);
  const [submitSessionId, setSubmitSessionId] = useState<number | null>(null);

  const isSuccess =
    modalMounted &&
    !modalClosing &&
    submitSessionId === openSessionId &&
    serverState.ok === true;

  const isProcessing =
    modalMounted &&
    !modalClosing &&
    submitSessionId === openSessionId &&
    serverState.ok === null &&
    !serverState.error;
  const errorToShow =
    modalMounted &&
    !modalClosing &&
    submitSessionId === openSessionId &&
    serverState.ok === false &&
    Boolean(serverState.error)
      ? serverState.error
      : null;

  function handleOpen() {
    setReason("");
    setSubmitSessionId(null);
    setOpenSessionId((v) => v + 1);
    setModalClosing(false);
    setModalMounted(true);
  }

  function handleCancel() {
    setModalClosing(true);
    setSubmitSessionId(null);
    window.setTimeout(() => {
      setModalMounted(false);
      setModalClosing(false);
    }, 200);
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className={`rounded-full bg-red-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-red-700 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 ${className}`}
      >
        {label}
      </button>

      {modalMounted ? (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center bg-black/40 transition-opacity duration-200 ${
            modalClosing ? "opacity-0" : "opacity-100"
          }`}
        >
          <div
            className={`w-full max-w-md rounded-xl bg-white p-5 shadow-lg transition-all duration-200 ${
              modalClosing ? "opacity-0 translate-y-2 scale-95" : "opacity-100 translate-y-0 scale-100"
            }`}
          >
            <h2 className="text-base font-semibold text-slate-900">
              {confirmTitle}
            </h2>
            <p className="mt-1 text-xs text-slate-600">{confirmDescription}</p>

            {isSuccess ? (
              <div className="mt-4 space-y-3 text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="h-5 w-5 text-emerald-700"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M20 6L9 17l-5-5"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div className="text-sm font-semibold text-slate-900">
                  Request submitted
                </div>
                <div className="text-xs text-slate-600">
                  Your request is awaiting admin approval.
                </div>
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      router.refresh();
                      handleCancel();
                    }}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <form
                className="mt-3 space-y-3"
                action={formAction}
              >
                <label className="block text-xs font-medium text-slate-700">
                  Reason for this request
                  <textarea
                    className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
                    rows={3}
                    name={reasonFieldName}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    autoFocus
                  />
                </label>
                {errorToShow ? (
                  <p className="text-xs text-rose-600">{errorToShow}</p>
                ) : null}
                <div className="mt-1 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    disabled={false}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    onClick={() => {
                      setSubmitSessionId(openSessionId);
                    }}
                    disabled={isProcessing}
                    className="rounded-full bg-red-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-red-700 disabled:opacity-60"
                  >
                    {isProcessing ? (
                      <span className="inline-flex items-center gap-2">
                        <InlineSpinner className="border-2 border-white/80" />
                        Processing…
                      </span>
                    ) : (
                      "Submit request"
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}

