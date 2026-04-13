"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { Gender } from "@/generated/prisma/enums";
import { AddressAutocomplete } from "./AddressAutocomplete";
import { SubmitButton } from "./form-buttons";
import { updateMemberAction } from "../app/(protected)/members/actions";

type FamilyGroup = { id: string; familyName: string };

export function EditMemberModal({
  open,
  onClose,
  memberId,
  firstName,
  lastName,
  gender,
  birthdateInput,
  contactNumber,
  address,
  familyGroupId,
  familyGroupName,
  familyGroups,
}: {
  open: boolean;
  onClose: () => void;
  memberId: string;
  firstName: string;
  lastName: string;
  gender: Gender | null;
  birthdateInput: string; // YYYY-MM-DD or ""
  contactNumber: string | null;
  address: string | null;
  familyGroupId: string | null;
  familyGroupName: string | null;
  familyGroups: FamilyGroup[];
}) {
  type ModalState = "closed" | "closing" | "open";
  const [modalState, setModalState] = useState<ModalState>("closed");
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);

  const [localFirstName, setLocalFirstName] = useState(firstName);
  const [localLastName, setLocalLastName] = useState(lastName);
  const [localGender, setLocalGender] = useState<string>(gender ?? "");
  const [localBirthdate, setLocalBirthdate] = useState<string>(birthdateInput);
  const [localContactNumber, setLocalContactNumber] = useState<string>(
    contactNumber ?? "",
  );
  const [localFamilyGroupId, setLocalFamilyGroupId] = useState<string>(
    familyGroupId ?? "",
  );
  const [localFamilyGroupName, setLocalFamilyGroupName] = useState<string>(
    familyGroupName ?? "",
  );

  // AddressAutocomplete manages the `address` input internally.
  const [addressKey, setAddressKey] = useState(0);

  useEffect(() => {
    setPortalRoot(document.body);
  }, []);

  useEffect(() => {
    if (open) {
      setLocalFirstName(firstName);
      setLocalLastName(lastName);
      setLocalGender(gender ?? "");
      setLocalBirthdate(birthdateInput);
      setLocalContactNumber(contactNumber ?? "");
      setLocalFamilyGroupId(familyGroupId ?? "");
      setLocalFamilyGroupName("");
      setAddressKey((v) => v + 1);
      setModalState("open");
      return;
    }

    if (!open && modalState === "open") {
      setModalState("closing");
      window.setTimeout(() => setModalState("closed"), 180);
    }
  }, [
    open,
    firstName,
    lastName,
    gender,
    birthdateInput,
    contactNumber,
    familyGroupId,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ]);

  if (modalState === "closed" || !portalRoot) return null;

  return createPortal(
    <div
      className="fixed inset-y-0 left-0 right-0 z-[210] overflow-y-auto md:left-72"
      role="dialog"
      aria-modal="true"
      aria-label="Edit member"
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
          "relative mx-auto w-full max-w-3xl max-h-[calc(100vh-2rem)] overflow-y-auto rounded-xl border border-slate-200 bg-white p-5 text-left shadow-lg",
          modalState === "closing"
            ? "translate-y-2 scale-[0.98] opacity-0 transition-all duration-180"
            : "opacity-100 translate-y-0 scale-100 transition-all duration-180",
        ].join(" ")}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0 text-left">
            <h2 className="text-base font-semibold text-slate-900">
              Edit member
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Update member details and family group.
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
          action={updateMemberAction.bind(null, memberId)}
          className="space-y-5 text-left"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-left">
              <div className="mb-1 text-left text-sm font-medium text-slate-700">
                First name
              </div>
              <input
                name="firstName"
                required
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                value={localFirstName}
                onChange={(e) => setLocalFirstName(e.target.value)}
              />
            </label>

            <label className="block text-left">
              <div className="mb-1 text-left text-sm font-medium text-slate-700">
                Last name
              </div>
              <input
                name="lastName"
                required
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                value={localLastName}
                onChange={(e) => setLocalLastName(e.target.value)}
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="block text-left">
              <div className="mb-1 text-left text-sm font-medium text-slate-700">
                Gender
              </div>
              <select
                name="gender"
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                value={localGender}
                onChange={(e) => setLocalGender(e.target.value)}
              >
                <option value="">—</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </label>

            <label className="block text-left">
              <div className="mb-1 text-left text-sm font-medium text-slate-700">
                Birthdate
              </div>
              <input
                name="birthdate"
                type="date"
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                value={localBirthdate}
                onChange={(e) => setLocalBirthdate(e.target.value)}
              />
            </label>

            <label className="block text-left">
              <div className="mb-1 text-left text-sm font-medium text-slate-700">
                Contact number
              </div>
              <input
                name="contactNumber"
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                value={localContactNumber}
                onChange={(e) => setLocalContactNumber(e.target.value)}
              />
            </label>
          </div>

          <label className="block text-left">
            <div className="mb-1 text-left text-sm font-medium text-slate-700">
              Address
            </div>
            <div key={addressKey}>
              <AddressAutocomplete
                name="address"
                defaultValue={address ?? ""}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </div>
          </label>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-left">
            <div className="text-left text-sm font-semibold text-slate-800">
              Family Group
            </div>
            <div className="mt-1 text-left text-xs text-slate-600">
              Choose an existing group, or enter a new family group name.
            </div>

            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <label className="block text-left">
                <div className="mb-1 text-left text-sm font-medium text-slate-700">
                  Select group
                </div>
                <select
                  name="familyGroupId"
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                  value={localFamilyGroupId}
                  onChange={(e) => setLocalFamilyGroupId(e.target.value)}
                >
                  <option value="">— No group —</option>
                  {familyGroups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.familyName}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-left">
                <div className="mb-1 text-left text-sm font-medium text-slate-700">
                  New group name (optional)
                </div>
                <input
                  name="familyGroupName"
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                  placeholder="e.g., Family of John"
                  value={localFamilyGroupName}
                  onChange={(e) => setLocalFamilyGroupName(e.target.value)}
                />
              </label>
            </div>
          </div>

          <div className="flex justify-start gap-2 pt-2">
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
              Save Member
            </SubmitButton>
          </div>
        </form>
      </div>
      </div>
    </div>,
    portalRoot
  );
}

