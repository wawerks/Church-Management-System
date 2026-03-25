"use client";

import { useMemo, useState } from "react";
import { createMemberAction } from "../app/(protected)/members/actions";
import { SubmitButton } from "./form-buttons";
import { AddressAutocomplete } from "./AddressAutocomplete";

type FamilyGroup = { id: string; familyName: string };

export function AddMemberModal({
  familyGroups,
}: {
  familyGroups: FamilyGroup[];
}) {
  type ModalState = "closed" | "opening" | "open" | "closing";
  const [modalState, setModalState] = useState<ModalState>("closed");

  // Remount AddressAutocomplete each open to reset its internal state.
  const [instanceKey, setInstanceKey] = useState(0);

  const genderOptions = useMemo(
    () => [
      { value: "", label: "—" },
      { value: "MALE", label: "Male" },
      { value: "FEMALE", label: "Female" },
      { value: "OTHER", label: "Other" },
    ],
    [],
  );

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState<string>("");
  const [birthdate, setBirthdate] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [familyGroupId, setFamilyGroupId] = useState("");
  const [familyGroupName, setFamilyGroupName] = useState("");

  function reset() {
    setInstanceKey((v) => v + 1);
    setFirstName("");
    setLastName("");
    setGender("");
    setBirthdate("");
    setContactNumber("");
    setFamilyGroupId("");
    setFamilyGroupName("");
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
        + Add Member
      </button>

      {isMounted ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Add Member"
        >
          <div
            className={`fixed inset-0 bg-black/40 transition-opacity duration-180 ease-out ${overlayClassName}`}
            onClick={closeModal}
          />

          <div
            className={`relative w-full max-w-3xl rounded-xl border border-slate-200 bg-white p-5 shadow-lg transition-all duration-180 ease-out ${panelClassName}`}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Add Member
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Enter member details and assign to a family group.
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
              action={createMemberAction}
              className="space-y-5"
              onSubmit={() => setModalState("closing")}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <div className="mb-1 text-sm font-medium text-slate-700">
                    First name
                  </div>
                  <input
                    name="firstName"
                    required
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </label>

                <label className="block">
                  <div className="mb-1 text-sm font-medium text-slate-700">
                    Last name
                  </div>
                  <input
                    name="lastName"
                    required
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <label className="block">
                  <div className="mb-1 text-sm font-medium text-slate-700">
                    Gender
                  </div>
                  <select
                    name="gender"
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                  >
                    {genderOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <div className="mb-1 text-sm font-medium text-slate-700">
                    Birthdate
                  </div>
                  <input
                    name="birthdate"
                    type="date"
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                    value={birthdate}
                    onChange={(e) => setBirthdate(e.target.value)}
                  />
                </label>

                <label className="block">
                  <div className="mb-1 text-sm font-medium text-slate-700">
                    Contact number
                  </div>
                  <input
                    name="contactNumber"
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                  />
                </label>
              </div>

              <label className="block">
                <div className="mb-1 text-sm font-medium text-slate-700">
                  Address
                </div>
                <div key={instanceKey}>
                  <AddressAutocomplete
                    name="address"
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                  />
                </div>
              </label>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-semibold text-slate-800">
                  Family Group
                </div>
                <div className="mt-1 text-xs text-slate-600">
                  Choose an existing group, or enter a new family group
                  name.
                </div>

                <div className="mt-3 grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <div className="mb-1 text-sm font-medium text-slate-700">
                      Select group
                    </div>
                    <select
                      name="familyGroupId"
                      className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                      value={familyGroupId}
                      onChange={(e) => setFamilyGroupId(e.target.value)}
                    >
                      <option value="">— No group —</option>
                      {familyGroups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.familyName}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <div className="mb-1 text-sm font-medium text-slate-700">
                      New group name (optional)
                    </div>
                    <input
                      name="familyGroupName"
                      className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                      placeholder="e.g., Family of John"
                      value={familyGroupName}
                      onChange={(e) => setFamilyGroupName(e.target.value)}
                    />
                  </label>
                </div>
              </div>

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
                  Save Member
                </SubmitButton>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

