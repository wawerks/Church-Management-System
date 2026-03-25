"use client";

import Link from "next/link";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { useState, useTransition } from "react";
import { updateUserAction } from "../../actions";
import { InlineSpinner } from "@/components/form-buttons";
import type { Role } from "@/generated/prisma/enums";

type Props = {
  userId: string;
  isSelf: boolean;
  defaultName: string;
  defaultRole: Role;
  email: string;
  defaultPhoneNumber: string | null;
  defaultAddress: string | null;
  defaultBirthdate: Date | null;
};

function toDateInputValue(d: Date | null) {
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function EditUserForm({
  userId,
  isSelf,
  defaultName,
  defaultRole,
  email,
  defaultPhoneNumber,
  defaultAddress,
  defaultBirthdate,
}: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("Unable to save");
  const [modalMessage, setModalMessage] = useState("");
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);
  const [pendingForm, setPendingForm] = useState<FormData | null>(null);
  const [pending, startTransition] = useTransition();

  function showModal(message: string, title = "Unable to save") {
    setModalTitle(title);
    setModalMessage(message);
    setModalOpen(true);
  }

  function submitUpdate(fd: FormData) {
    const role = (fd.get("role") ?? "") as string;

    if (isSelf && role !== "ADMIN") {
      showModal(
        "You can’t change your own role. Your account must stay Admin so you can manage users and settings.",
        "Can’t change your role",
      );
      return;
    }

    startTransition(async () => {
      try {
        const result = await updateUserAction(userId, fd);
        if (result && !result.ok) {
          showModal(result.message);
        }
      } catch (err) {
        if (isRedirectError(err)) {
          throw err;
        }
        showModal("Something went wrong. Please try again.");
      }
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPendingForm(new FormData(e.currentTarget));
    setSaveConfirmOpen(true);
  }

  return (
    <>
      {modalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-user-modal-title"
        >
          <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-5 shadow-lg">
            <h2
              id="edit-user-modal-title"
              className="text-sm font-semibold text-slate-900"
            >
              {modalTitle}
            </h2>
            <p className="mt-2 text-sm text-slate-600">{modalMessage}</p>
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="mt-4 w-full rounded-md bg-black py-2 text-sm font-medium text-white hover:bg-black/90"
            >
              OK
            </button>
          </div>
        </div>
      ) : null}
      {saveConfirmOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-save-user-title"
        >
          <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-5 shadow-lg">
            <h2
              id="confirm-save-user-title"
              className="text-sm font-semibold text-slate-900"
            >
              Confirm save
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Save changes to this user?
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSaveConfirmOpen(false)}
                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const fd = pendingForm;
                  setSaveConfirmOpen(false);
                  if (fd) submitUpdate(fd);
                }}
                className="rounded-md bg-black px-3 py-2 text-sm font-medium text-white hover:bg-black/90"
              >
                Proceed
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <div className="mb-1 text-sm font-medium text-slate-700">Name</div>
          <input
            name="name"
            required
            defaultValue={defaultName}
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
          />
        </label>

        <div className="block">
          <div className="mb-1 text-sm font-medium text-slate-700">Email</div>
          <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            {email}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            To change email or password, use a future account tool or contact
            support.
          </p>
        </div>

        <label className="block">
          <div className="mb-1 text-sm font-medium text-slate-700">Role</div>
          <select
            name="role"
            required
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            defaultValue={defaultRole}
          >
            <option value="ADMIN">Admin — full access + user management</option>
            <option value="PASTOR">Pastor — view only</option>
            <option value="STAFF">
              Staff — attendance, donations, expenses, report exports
            </option>
            <option value="TREASURER">
              Treasurer — donations, tithes/offering, expenses, financial
              reports
            </option>
          </select>
          {isSelf ? (
            <p className="mt-1 text-xs text-amber-800">
              You must stay <strong>Admin</strong> on your own account.
            </p>
          ) : null}
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <div className="mb-1 text-sm font-medium text-slate-700">
              Phone number
            </div>
            <input
              name="phoneNumber"
              type="tel"
              defaultValue={defaultPhoneNumber ?? ""}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
              placeholder="Optional"
            />
          </label>

          <label className="block">
            <div className="mb-1 text-sm font-medium text-slate-700">Birthday</div>
            <input
              name="birthdate"
              type="date"
              defaultValue={toDateInputValue(defaultBirthdate)}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            />
          </label>
        </div>

        <label className="block">
          <div className="mb-1 text-sm font-medium text-slate-700">Address</div>
          <input
            name="address"
            defaultValue={defaultAddress ?? ""}
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            placeholder="Optional"
          />
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <Link
            href="/users"
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={pending}
            aria-busy={pending}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-black px-3 py-2 text-sm font-medium text-white hover:bg-black/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? (
              <>
                <InlineSpinner className="text-white" />
                <span>Saving…</span>
              </>
            ) : (
              "Save changes"
            )}
          </button>
        </div>
      </form>
    </>
  );
}
