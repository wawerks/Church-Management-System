"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import type { Role } from "@/generated/prisma/enums";
import { LogoutButton } from "@/components/LogoutButton";
import { canManageUsers } from "@/lib/permissions";

type IconName =
  | "dashboard"
  | "profile"
  | "users"
  | "members"
  | "attendance"
  | "income"
  | "donations"
  | "expenses"
  | "events"
  | "reportFinancial"
  | "reportAttendance"
  | "logs";

function NavIcon({ name }: { name: IconName }) {
  const common = "h-4 w-4 text-current";
  if (name === "dashboard") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={common}>
        <path d="M3 13h8V3H3v10Zm10 8h8V3h-8v18ZM3 21h8v-6H3v6Z" fill="currentColor" />
      </svg>
    );
  }
  if (name === "profile") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={common}>
        <path
          d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-4 0-7 2-7 4.5V20h14v-1.5C19 16 16 14 12 14Z"
          fill="currentColor"
        />
      </svg>
    );
  }
  if (name === "users" || name === "members") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={common}>
        <path d="M16 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM8 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm8 2c-3.3 0-6 1.8-6 4v2h12v-2c0-2.2-2.7-4-6-4ZM8 15c-4 0-7 2.1-7 4.8V22h7v-2.2c0-1 .3-2 .9-2.8A9 9 0 0 1 8 15Z" fill="currentColor" />
      </svg>
    );
  }
  if (name === "attendance") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={common}>
        <path d="M7 2v2H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2H7Zm12 8H5v10h14V10Zm-9.7 8-3-3 1.4-1.4 1.6 1.6 4-4L15 12.2l-5.7 5.8Z" fill="currentColor" />
      </svg>
    );
  }
  if (name === "income" || name === "donations" || name === "expenses") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={common}>
        <path d="M3 17h4v4H3v-4Zm7-7h4v11h-4V10Zm7-7h4v18h-4V3Z" fill="currentColor" />
      </svg>
    );
  }
  if (name === "events") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={common}>
        <path d="M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm0 16H5V10h14v10Zm-9-6h2v2h-2v-2Zm0-4h2v2h-2v-2Z" fill="currentColor" />
      </svg>
    );
  }
  if (name === "logs") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={common}>
        <path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm2 5h10V6H7v2Zm0 4h10v-2H7v2Zm0 4h7v-2H7v2Z" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" className={common}>
      <path d="M3 3h18v6H3V3Zm0 8h18v10H3V11Zm2 2v6h14v-6H5Z" fill="currentColor" />
    </svg>
  );
}

function NavItem(props: {
  href: string;
  label: string;
  icon: IconName;
  isActive: boolean;
  badgeCount?: number;
}) {
  const showBadge =
    typeof props.badgeCount === "number" && props.badgeCount > 0;
  return (
    <li>
      <Link
        href={props.href}
        aria-current={props.isActive ? "page" : undefined}
        className={`flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-semibold transition ${
          props.isActive
            ? "bg-[#f4fbfd] !text-[#2f7d98] shadow-[0_2px_8px_rgba(12,45,58,0.16)]"
            : "!text-white hover:bg-white/10 !hover:text-white"
        }`}
      >
        <NavIcon name={props.icon} />
        <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
          <span className="truncate">{props.label}</span>
          {showBadge ? (
            <span className="inline-flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {props.badgeCount! > 99 ? "99+" : props.badgeCount}
            </span>
          ) : null}
        </span>
      </Link>
    </li>
  );
}

export function Sidebar(props: {
  role: Role;
  userName?: string;
  children?: ReactNode;
  pendingVoidCount?: number;
}) {
  const role = props.role;
  const pathname = usePathname();

  const topNav: Array<{
    href: string;
    label: string;
    icon: IconName;
    roles?: Role[];
    badgeCount?: number;
  }> = [
    { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
    { href: "/profile", label: "Profile", icon: "profile" },
    ...(canManageUsers(role)
      ? [{ href: "/users", label: "Users & roles" as const, icon: "users" as const }]
      : []),
    { href: "/members", label: "Members", icon: "members", roles: ["ADMIN", "PASTOR", "STAFF", "TREASURER"] },
    { href: "/attendance", label: "Attendance", icon: "attendance", roles: ["ADMIN", "PASTOR", "STAFF", "TREASURER"] },
    {
      href: "/tithes-offering",
      label: "Tithes & Offering",
      icon: "income",
      roles: ["ADMIN", "PASTOR", "STAFF", "TREASURER"],
    },
    { href: "/donations", label: "Donations", icon: "donations", roles: ["ADMIN", "PASTOR", "STAFF", "TREASURER"] },
    { href: "/expenses", label: "Expenses", icon: "expenses", roles: ["ADMIN", "PASTOR", "STAFF", "TREASURER"] },
    ...(canManageUsers(role)
      ? [
          {
            href: "/expenses/types",
            label: "Expense Types",
            icon: "expenses" as const,
            roles: ["ADMIN"] as Role[],
          },
          {
            href: "/void-requests",
            label: "Void approvals",
            icon: "logs" as const,
            roles: ["ADMIN"] as Role[],
            badgeCount: props.pendingVoidCount,
          },
        ]
      : []),
    { href: "/events", label: "Events", icon: "events", roles: ["ADMIN", "PASTOR", "TREASURER"] },
    {
      href: "/reports/financial",
      label: "Financial Reports",
      icon: "reportFinancial",
      roles: ["ADMIN", "PASTOR", "STAFF", "TREASURER"],
    },
    {
      href: "/reports/attendance",
      label: "Attendance Reports",
      icon: "reportAttendance",
      roles: ["ADMIN", "PASTOR", "STAFF", "TREASURER"],
    },
    ...(canManageUsers(role)
      ? [{ href: "/logs", label: "Action Logs", icon: "logs" as const, roles: ["ADMIN"] as Role[] }]
      : []),
  ];

  function isActivePath(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function initials(name?: string) {
    if (!name) return "CA";
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return (
    <aside className="sticky top-0 hidden h-screen w-72 shrink-0 overflow-hidden rounded-r-[30px] bg-[#236d88] md:block">
      <div className="flex h-full flex-col overflow-hidden">
        <Link
          href="/profile"
          className="block bg-[#1f2544] px-5 pb-6 pt-4 outline-none transition hover:bg-[#252b4d] focus-visible:ring-2 focus-visible:ring-white/40"
        >
          <div className="mx-auto mt-5 flex h-14 w-14 items-center justify-center rounded-full border-4 border-[#d9e5ed] bg-[#44638c] text-3xl font-bold text-white">
            {initials(props.userName)}
          </div>
          <div className="mt-5 text-center text-xs font-bold tracking-wide text-[#f4f8ff]">
            {(props.userName ?? "Church Admin").toUpperCase()}
          </div>
          <p className="mt-1 text-center text-[10px] font-medium text-[#a8b8d4]">
            View profile
          </p>
        </Link>

        <nav className="min-h-0 flex-1 overflow-y-auto px-4 pb-3 pt-3">
          <ul className="space-y-2.5">
            {topNav
              .filter((i) => !i.roles || i.roles.includes(role))
              .map((i) => (
                <NavItem
                  key={i.href}
                  href={i.href}
                  label={i.label}
                  icon={i.icon}
                  isActive={isActivePath(i.href)}
                  badgeCount={i.badgeCount}
                />
              ))}
          </ul>
        </nav>

        <div className="px-4 pb-4">
          <LogoutButton />
        </div>
      </div>
    </aside>
  );
}

