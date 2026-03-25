"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type RowActionsMenuProps = {
  /** Unique id for aria / portal menu (e.g. row cuid) */
  rowId: string;
  editHref?: string;
  onEdit?: () => void;
  /** Bound server action; omit to hide delete */
  deleteAction?: (formData: FormData) => void | Promise<void>;
  deleteLabel?: string;
  deleteConfirmMessage?: string;
};

export function RowActionsMenu({
  rowId,
  editHref,
  onEdit,
  deleteAction,
  deleteLabel = "Delete",
  deleteConfirmMessage = "Are you sure you want to delete this item?",
}: RowActionsMenuProps) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"delete" | null>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const deleteFormRef = useRef<HTMLFormElement>(null);
  const menuDomId = `row-actions-${rowId}`;

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = useCallback(() => {
    const el = buttonRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const menuWidth = 160;
    const left = Math.min(
      r.right - menuWidth,
      typeof window !== "undefined" ? window.innerWidth - menuWidth - 8 : r.left,
    );
    setCoords({ top: r.bottom + 4, left: Math.max(8, left) });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const onScroll = () => setOpen(false);
    const onResize = () => updatePosition();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      const t = e.target as Node;
      if (buttonRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const showDelete = Boolean(deleteAction);

  const menu = open ? (
    <>
      <div
        className="fixed inset-0 z-[100] bg-transparent"
        aria-hidden
        onClick={() => setOpen(false)}
      />
      <div
        ref={menuRef}
        id={menuDomId}
        role="menu"
        aria-orientation="vertical"
        className="fixed z-[110] min-w-[10rem] rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        style={{ top: coords.top, left: coords.left }}
      >
        {onEdit ? (
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
            className="w-full justify-start rounded-none border-0 bg-transparent px-3 py-2 text-left text-sm font-normal text-slate-800 shadow-none hover:bg-slate-50"
          >
            Edit
          </button>
        ) : editHref ? (
          <Link
            href={editHref}
            role="menuitem"
            className="block px-3 py-2 text-sm text-slate-800 hover:bg-slate-50"
            onClick={() => {
              setOpen(false);
            }}
          >
            Edit
          </Link>
        ) : null}
        {showDelete && deleteAction ? (
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setConfirmAction("delete");
              setOpen(false);
            }}
            className="w-full justify-start rounded-none border-0 bg-transparent px-3 py-2 text-left text-sm font-normal text-red-600 shadow-none hover:bg-red-50 hover:text-red-700"
          >
            {deleteLabel}
          </button>
        ) : null}
      </div>
    </>
  ) : null;

  const confirmModal = confirmAction ? (
    <>
      <div className="fixed inset-0 z-[200] bg-black/40" />
      <div className="fixed inset-0 z-[210] flex items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-5 shadow-lg">
          <h3 className="text-base font-semibold text-slate-900">
            Confirm action
          </h3>
          <p className="mt-2 text-sm text-slate-600">
            {deleteConfirmMessage}
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setConfirmAction(null)}
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirmAction(null);
                deleteFormRef.current?.requestSubmit();
              }}
              className="rounded-md bg-black px-3 py-2 text-sm font-medium text-white hover:bg-black/90"
            >
              Proceed
            </button>
          </div>
        </div>
      </div>
    </>
  ) : null;

  return (
    <div className="relative flex justify-end">
      {showDelete && deleteAction ? (
        <form ref={deleteFormRef} action={deleteAction} className="hidden" />
      ) : null}
      <button
        ref={buttonRef}
        type="button"
        className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
        aria-label="Row actions"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={open ? menuDomId : undefined}
        onClick={() => {
          if (!open) updatePosition();
          setOpen((v) => !v);
        }}
      >
        <svg
          className="h-5 w-5"
          fill="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <circle cx="6" cy="12" r="1.75" />
          <circle cx="12" cy="12" r="1.75" />
          <circle cx="18" cy="12" r="1.75" />
        </svg>
      </button>
      {mounted && menu ? createPortal(menu, document.body) : null}
      {mounted && confirmModal ? createPortal(confirmModal, document.body) : null}
    </div>
  );
}
