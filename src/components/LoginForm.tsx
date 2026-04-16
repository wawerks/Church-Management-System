"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { InlineSpinner } from "@/components/form-buttons";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; message?: string }
        | null;

      if (!res.ok || !data?.ok) {
        setError(data?.message ?? "Login failed. Please try again.");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-xl md:grid-cols-2">
      <div className="relative px-6 py-10 sm:px-10">
        <div className="mb-8 flex items-center gap-3">
          <div
            className="grid h-12 w-12 place-items-center rounded-xl border"
            style={{
              borderColor: "var(--border)",
              backgroundColor: "var(--surface-soft)",
            }}
          >
            <div
              className="grid h-8 w-8 place-items-center rounded-lg text-sm font-bold text-white"
              style={{ backgroundColor: "var(--primary)" }}
              aria-hidden
            >
              CM
            </div>
          </div>
          <div>
            <div className="text-lg font-semibold text-slate-900">
              Church Management System
            </div>
            <div className="text-xs text-slate-600">Diprella Parish Portal</div>
          </div>
        </div>

        <div className="mb-6">
          <h1 className="text-3xl normal-case">Sign in to CMS</h1>
          <p className="mt-2 text-sm text-slate-600">
            Access members, attendance, events, and reports in one secure place.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
        <label className="block">
          <div className="mb-1 text-sm font-medium text-slate-700">Email</div>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 transition-all duration-200 focus:-translate-y-0.5 focus:shadow-lg"
            style={
              {
                "--tw-shadow-color": "rgba(31, 107, 135, 0.25)",
              } as React.CSSProperties
            }
            autoComplete="email"
            placeholder="you@church.org"
          />
        </label>

        <label className="block">
          <div className="mb-1 text-sm font-medium text-slate-700">
            Password
          </div>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 transition-all duration-200 focus:-translate-y-0.5 focus:shadow-lg"
            style={
              {
                "--tw-shadow-color": "rgba(31, 107, 135, 0.25)",
              } as React.CSSProperties
            }
            autoComplete="current-password"
            placeholder="Enter your password"
          />
        </label>

        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          aria-busy={submitting}
          className="w-full rounded-full px-4 py-3 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          style={{ backgroundColor: "var(--primary)" }}
        >
          {submitting ? (
            <span className="inline-flex items-center justify-center gap-2">
              <InlineSpinner />
              Signing in…
            </span>
          ) : (
            "Sign in"
          )}
        </button>
        </form>
      </div>

      <div
        className="relative hidden overflow-hidden px-8 py-10 text-white md:flex md:flex-col md:justify-between"
        style={{
          background:
            "linear-gradient(160deg, var(--primary) 0%, #2a7c9b 55%, #4f9fb7 100%)",
        }}
      >
        <div
          className="absolute -top-16 -right-16 h-56 w-56 rounded-full opacity-20"
          style={{ backgroundColor: "var(--surface)" }}
          aria-hidden
        />
        <div
          className="absolute bottom-6 right-8 h-28 w-28 rotate-12 rounded-3xl opacity-15"
          style={{ backgroundColor: "var(--surface-soft)" }}
          aria-hidden
        />
        <div className="relative">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/40 px-4 py-2 text-xs tracking-wide">
            <span
              className="inline-block h-2 w-2 animate-pulse rounded-full bg-white"
              aria-hidden
            />
            CHURCH-MANAGEMENT-SYSTEM
          </div>
          <h2 className="text-5xl font-semibold normal-case leading-tight text-white">
            Welcome Back
          </h2>
          <p className="mt-3 max-w-xs text-sm text-white/90">
            Continue serving your community with organized records and real-time
            ministry insights.
          </p>
        </div>

        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/45 px-5 py-2 text-xs font-semibold tracking-[0.2em] text-white/95 transition-all duration-300 hover:bg-white/10">
            SECURE ACCESS
          </div>
        </div>
      </div>
    </div>
  );
}

