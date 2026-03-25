"use client";

import { useState } from "react";
import { RowActionsMenu } from "./RowActionsMenu";
import { EditProfileModal } from "./EditProfileModal";
import type { Role } from "@/generated/prisma/enums";

export function ProfileActionsMenu({
  userId,
  name,
  email,
  role,
  phoneNumber,
  address,
  birthdateInput,
  deleteAction,
}: {
  userId: string;
  name: string;
  email: string;
  role: Role;
  phoneNumber: string | null;
  address: string | null;
  birthdateInput: string;
  deleteAction?: (formData: FormData) => void | Promise<void>;
}) {
  const [editOpen, setEditOpen] = useState(false);

  return (
    <>
      <RowActionsMenu
        rowId={userId}
        editHref="/profile/edit"
        onEdit={() => setEditOpen(true)}
        deleteAction={deleteAction}
        deleteLabel="Delete profile"
        deleteConfirmMessage="Permanently delete your account? This will sign you out."
      />

      <EditProfileModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        userId={userId}
        name={name}
        email={email}
        phoneNumber={phoneNumber}
        address={address}
        birthdateInput={birthdateInput}
      />
    </>
  );
}

