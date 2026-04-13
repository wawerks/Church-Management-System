"use client";

import { useState } from "react";
import { RowActionsMenu } from "@/components/RowActionsMenu";
import { EditEventModal } from "@/components/EditEventModal";

export function EventRowActionsMenu({
  eventId,
  title,
  description,
  dateInput,
  deleteAction,
}: {
  eventId: string;
  title: string;
  description: string | null;
  dateInput: string;
  deleteAction: (formData: FormData) => void | Promise<void>;
}) {
  const [editOpen, setEditOpen] = useState(false);

  return (
    <>
      <RowActionsMenu
        rowId={eventId}
        onEdit={() => setEditOpen(true)}
        deleteAction={deleteAction}
        deleteLabel="Delete"
        deleteConfirmMessage="Permanently delete this event?"
      />
      <EditEventModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        eventId={eventId}
        defaultTitle={title}
        defaultDescription={description}
        defaultDateInput={dateInput}
      />
    </>
  );
}
