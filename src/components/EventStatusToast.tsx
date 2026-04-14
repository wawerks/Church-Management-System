"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

export function EventStatusToast({ status }: { status: "added" | "updated" }) {
  const [visible, setVisible] = useState(true);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPortalRoot(document.body);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(false), 2200);
    return () => window.clearTimeout(timer);
  }, []);

  const label = useMemo(
    () => (status === "added" ? "Event added" : "Event updated"),
    [status],
  );

  if (!visible || !portalRoot) return null;

  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[300] flex justify-center px-4">
      <div className="pointer-events-auto rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm font-medium text-emerald-800 shadow-lg">
        <div className="inline-flex items-center gap-2">
          <span
            className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white"
            aria-hidden
          >
            ✓
          </span>
          <span>{label}</span>
        </div>
      </div>
    </div>,
    portalRoot,
  );
}
