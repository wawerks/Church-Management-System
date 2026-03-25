"use client";

import { useState } from "react";
import { RowActionsMenu } from "./RowActionsMenu";
import { EditMemberModal } from "./EditMemberModal";

type FamilyGroup = { id: string; familyName: string };

export function MemberRowActionsMenu({
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
  deleteAction,
}: {
  memberId: string;
  firstName: string;
  lastName: string;
  gender: string | null;
  birthdateInput: string;
  contactNumber: string | null;
  address: string | null;
  familyGroupId: string | null;
  familyGroupName: string | null;
  familyGroups: FamilyGroup[];
  deleteAction?: (formData: FormData) => void | Promise<void>;
}) {
  const [editOpen, setEditOpen] = useState(false);

  return (
    <>
      <RowActionsMenu
        rowId={memberId}
        editHref={undefined}
        onEdit={() => setEditOpen(true)}
        deleteAction={deleteAction}
        deleteLabel="Delete"
      />

      <EditMemberModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        memberId={memberId}
        firstName={firstName}
        lastName={lastName}
        // gender in the listing is serialized; pass through and let updateMemberAction validate.
        gender={(gender as any) ?? null}
        birthdateInput={birthdateInput}
        contactNumber={contactNumber}
        address={address}
        familyGroupId={familyGroupId}
        familyGroupName={familyGroupName}
        familyGroups={familyGroups}
      />
    </>
  );
}

