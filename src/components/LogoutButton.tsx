"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { InlineSpinner } from "@/components/form-buttons";

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onLogout() {
    if (loading) return;
    try {
      setLoading(true);
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  return (
    <button
      type="button"
      onClick={onLogout}
      disabled={loading}
      aria-busy={loading}
      className="w-full rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? (
        <span className="inline-flex items-center justify-center gap-2">
          <InlineSpinner />
          Signing out…
        </span>
      ) : (
        "Sign out"
      )}
    </button>
  );
}

