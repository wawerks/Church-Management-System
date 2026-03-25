"use client";

import { useState } from "react";
import type { Role } from "@/generated/prisma/enums";
import { RowActionsMenu } from "./RowActionsMenu";
import { EditUserModal } from "./EditUserModal";

export function UserRowActionsMenu({
  userId,
  name,
  email,
  role,
  phoneNumber,
  address,
  birthdateInput,
  isSelf,
  deleteAction,
}: {
  userId: string;
  name: string;
  email: string;
  role: Role;
  phoneNumber: string | null;
  address: string | null;
  birthdateInput: string | null; // YYYY-MM-DD or ISO or null
  isSelf: boolean;
  deleteAction?: (formData: FormData) => void | Promise<void>;
}) {
  const [editOpen, setEditOpen] = useState(false);

  return (
    <>
      <RowActionsMenu
        rowId={userId}
        editHref={undefined}
        onEdit={() => setEditOpen(true)}
        deleteAction={deleteAction}
        deleteLabel="Remove"
      />

      <EditUserModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        userId={userId}
        isSelf={isSelf}
        defaultName={name}
        defaultRole={role}
        email={email}
        defaultPhoneNumber={phoneNumber}
        defaultAddress={address}
        defaultBirthdateInput={birthdateInput}
      />
    </>
  );
}

