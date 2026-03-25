"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type FormHTMLAttributes,
} from "react";
import { useFormStatus } from "react-dom";

export function InlineSpinner({ className }: { className?: string }) {
  return (
    <span
      className={`inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent ${className ?? ""}`}
      aria-hidden
    />
  );
}

type SubmitButtonProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "type"
> & {
  pendingLabel?: string;
};

/**
 * Submit button for forms using Next.js Server Actions.
 * Disables and shows a spinner while the action runs (prevents double submit).
 */
export function SubmitButton({
  children,
  pendingLabel = "Please wait…",
  className = "",
  disabled,
  ...rest
}: SubmitButtonProps) {
  const { pending } = useFormStatus();
  const isBusy = Boolean(pending || disabled);
  const showPendingText = pendingLabel.trim().length > 0;
  return (
    <button
      type="submit"
      {...rest}
      disabled={isBusy}
      aria-busy={pending}
      className={`${className} active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 disabled:cursor-not-allowed disabled:opacity-60`.trim()}
    >
      {pending ? (
        <span
          className={`flex w-full items-center justify-center ${showPendingText ? "gap-2" : ""}`}
        >
          <InlineSpinner />
          {showPendingText ? <span>{pendingLabel}</span> : null}
        </span>
      ) : (
        children
      )}
    </button>
  );
}

type DeleteSubmitButtonProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "type"
> & {
  pendingLabel?: string;
  children?: React.ReactNode;
  confirmMessage?: string;
};

/** Destructive submit (server actions): pill shape, red fill; pending state is spinner only by default. */
export function DeleteSubmitButton({
  children = "Delete",
  pendingLabel = "",
  confirmMessage = "Are you sure you want to delete this item?",
  className = "",
  disabled,
  onClick,
  onClickCapture,
  ...rest
}: DeleteSubmitButtonProps) {
  return (
    <SubmitButton
      pendingLabel={pendingLabel}
      disabled={disabled}
      onClickCapture={(e) => {
        if (!window.confirm(confirmMessage)) {
          e.preventDefault();
          return;
        }
        onClickCapture?.(e);
      }}
      onClick={(e) => {
        onClick?.(e);
      }}
      className={`rounded-full bg-red-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-red-700 ${className}`.trim()}
      {...rest}
    >
      {children}
    </SubmitButton>
  );
}

const GetFormPendingContext = createContext(false);

type PendingGetFormProps = Omit<
  FormHTMLAttributes<HTMLFormElement>,
  "onSubmit"
>;

/**
 * Wraps a GET form so submit buttons can show pending state until navigation completes.
 */
export function PendingGetForm({ children, ...rest }: PendingGetFormProps) {
  const [pending, setPending] = useState(false);
  const handleSubmit = useCallback(() => {
    setPending(true);
  }, []);
  return (
    <GetFormPendingContext.Provider value={pending}>
      <form {...rest} onSubmit={handleSubmit}>
        {children}
      </form>
    </GetFormPendingContext.Provider>
  );
}

type GetSubmitButtonProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "type"
> & {
  pendingLabel?: string;
};

/** Submit button for GET forms wrapped in {@link PendingGetForm}. */
export function GetSubmitButton({
  children,
  pendingLabel = "Please wait…",
  className = "",
  disabled,
  ...rest
}: GetSubmitButtonProps) {
  const pending = useContext(GetFormPendingContext);
  const isBusy = Boolean(pending || disabled);
  return (
    <button
      type="submit"
      {...rest}
      disabled={isBusy}
      aria-busy={pending}
      className={`${className} active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 disabled:cursor-not-allowed disabled:opacity-60`.trim()}
    >
      {pending ? (
        <span className="flex w-full items-center justify-center gap-2">
          <InlineSpinner />
          <span>{pendingLabel}</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
}
