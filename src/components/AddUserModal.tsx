"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { createUserAction } from "../app/(protected)/users/actions";
import { SubmitButton } from "./form-buttons";

type RoleValue = "ADMIN" | "PASTOR" | "STAFF" | "TREASURER";

export function AddUserModal() {
  type ModalState = "closed" | "opening" | "open" | "closing";
  const [modalState, setModalState] = useState<ModalState>("closed");
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPortalRoot(document.body);
  }, []);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<RoleValue>("STAFF");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [address, setAddress] = useState("");

  function reset() {
    setName("");
    setEmail("");
    setPassword("");
    setRole("STAFF");
    setPhoneNumber("");
    setBirthdate("");
    setAddress("");
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
        + Add user
      </button>

      {isMounted && portalRoot ? createPortal(
        <div
          className="fixed inset-y-0 left-0 right-0 z-[200] overflow-y-auto md:left-72"
          role="dialog"
          aria-modal="true"
          aria-label="Add user"
        >
          <div
            className={`fixed inset-y-0 left-0 right-0 bg-black/40 backdrop-blur-[1px] transition-opacity duration-180 ease-out md:left-72 ${overlayClassName}`}
            onClick={closeModal}
          />

          <div className="flex min-h-full w-full items-center justify-center p-4">
            <div
              className={`relative mx-auto w-full max-w-lg rounded-xl border border-slate-200 bg-white p-5 shadow-lg transition-all duration-180 ease-out ${panelClassName}`}
            >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Add user
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Choose a role: Pastor is view-only; Staff can manage data.
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
              action={createUserAction}
              className="space-y-4"
              onSubmit={() => setModalState("closing")}
            >
              <label className="block">
                <div className="mb-1 text-sm font-medium text-slate-700">Name</div>
                <input
                  name="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                />
              </label>

              <label className="block">
                <div className="mb-1 text-sm font-medium text-slate-700">Email</div>
                <input
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                />
              </label>

              <label className="block">
                <div className="mb-1 text-sm font-medium text-slate-700">
                  Password
                </div>
                <input
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                />
                <div className="mt-1 text-xs text-slate-500">
                  At least 8 characters.
                </div>
              </label>

              <label className="block">
                <div className="mb-1 text-sm font-medium text-slate-700">
                  Role
                </div>
                <select
                  name="role"
                  required
                  value={role}
                  onChange={(e) => setRole(e.target.value as RoleValue)}
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  <option value="ADMIN">
                    Admin — full access + user management
                  </option>
                  <option value="PASTOR">Pastor — view only</option>
                  <option value="STAFF">
                    Staff — attendance, donations, expenses, report exports
                  </option>
                  <option value="TREASURER">
                    Treasurer — donations, tithes/offering, expenses, financial
                    reports
                  </option>
                </select>
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <div className="mb-1 text-sm font-medium text-slate-700">
                    Phone number
                  </div>
                  <input
                    name="phoneNumber"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                    placeholder="Optional"
                  />
                </label>

                <label className="block">
                  <div className="mb-1 text-sm font-medium text-slate-700">
                    Birthday
                  </div>
                  <input
                    name="birthdate"
                    type="date"
                    value={birthdate}
                    onChange={(e) => setBirthdate(e.target.value)}
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                  />
                </label>
              </div>

              <label className="block">
                <div className="mb-1 text-sm font-medium text-slate-700">
                  Address
                </div>
                <input
                  name="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                  placeholder="Optional"
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
                  pendingLabel="Creating…"
                  className="rounded-md bg-black px-3 py-2 text-sm font-medium text-white hover:bg-black/90"
                >
                  Create user
                </SubmitButton>
              </div>
            </form>
            </div>
          </div>
        </div>,
        portalRoot
      ) : null}
    </>
  );
}

