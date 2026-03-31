"use client";

import { useEffect } from "react";

/** Scrolls an expenses-table row into view when opening /expenses?highlight=… */
export function ExpenseHighlightScroller({ expenseId }: { expenseId: string }) {
  useEffect(() => {
    const el = document.getElementById(`expense-row-${expenseId}`);
    if (!el) return;
    el.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [expenseId]);
  return null;
}
