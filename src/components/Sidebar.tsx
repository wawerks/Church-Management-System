"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import type { Role } from "@/generated/prisma/enums";
import { LogoutButton } from "@/components/LogoutButton";
import { canManageUsers, canRequestFinancialVoid } from "@/lib/permissions";
import { roleLabel } from "@/lib/role-label";

type IconName =
  | "dashboard"
  | "profile"
  | "users"
  | "members"
  | "attendance"
  | "income"
  | "donations"
  | "expenses"
  | "expenseTypes"
  | "voidApprovals"
  | "voidRequest"
  | "events"
  | "reportFinancial"
  | "reportAttendance"
  | "workbook"
  | "logs";

function NavIcon({ name }: { name: IconName }) {
  const common = "h-4 w-4 shrink-0 text-current";
  switch (name) {
    case "dashboard":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={common} aria-hidden>
          <path
            d="M3 13h8V3H3v10Zm10 8h8V3h-8v18ZM3 21h8v-6H3v6Z"
            fill="currentColor"
          />
        </svg>
      );
    case "profile":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={common} aria-hidden>
          <path
            d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-4 0-7 2-7 4.5V20h14v-1.5C19 16 16 14 12 14Z"
            fill="currentColor"
          />
        </svg>
      );
    case "users":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={common} aria-hidden>
          <path
            d="M11.983 1.907a.75.75 0 0 1 1.292-.657l2.062 2.45 3.183-.177a.75.75 0 0 1 .752.75v3.086a.75.75 0 0 1-.712.749l-3.183.177-2.062 2.45a.75.75 0 0 1-1.292 0l-2.062-2.45-3.183.177A.75.75 0 0 1 2.25 7.761V4.675a.75.75 0 0 1 .752-.75l3.183-.177 2.062-2.45a.75.75 0 0 1 .736-.441ZM8.657 12.074l-1.716 2.043a.75.75 0 0 0 .155 1.07l2.625 1.906a.75.75 0 0 0 .976-.183l1.716-2.043-1.049-.763a3.75 3.75 0 0 1 0-5.684l1.049-.763-1.716-2.043a.75.75 0 0 0-.976-.183L7.29 8.004a.75.75 0 0 0-.155 1.07Zm6.686 0 1.716 2.043a.75.75 0 0 1-.155 1.07l-2.625 1.906a.75.75 0 0 1-.976-.183l-1.716-2.043 1.049-.763a3.75 3.75 0 0 0 0-5.684l-1.049-.763 1.716-2.043a.75.75 0 0 1 .976-.183l2.625 1.906a.75.75 0 0 1 .155 1.07Z"
            fill="currentColor"
            fillRule="evenodd"
            clipRule="evenodd"
          />
        </svg>
      );
    case "members":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={common} aria-hidden>
          <path
            d="M9 11a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm4.5 2a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"
            fill="currentColor"
          />
          <path
            d="M5.25 14.5c-2.9 0-4.75 1.4-4.75 3.25V19h8v-1.25c0-1.85-1.85-3.25-4.75-3.25h-.5Zm8.75-.25c2.2.4 3.75 1.6 3.75 3.5V19H13v-1.25c0-1.35-.85-2.45-2.25-3Z"
            fill="currentColor"
          />
          <path
            d="M17 10.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
            fill="currentColor"
          />
        </svg>
      );
    case "attendance":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={common} aria-hidden>
          <path
            d="M7 2v2H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2H7Zm12 8H5v10h14V10Zm-9.7 8-3-3 1.4-1.4 1.6 1.6 4-4L15 12.2l-5.7 5.8Z"
            fill="currentColor"
          />
        </svg>
      );
    case "income":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={common} aria-hidden>
          <ellipse cx="12" cy="16" rx="6.5" ry="2.75" fill="currentColor" />
          <path d="M5.5 10.5h13v5.5h-13v-5.5Z" fill="currentColor" />
          <ellipse cx="12" cy="10.5" rx="6.5" ry="2.75" fill="currentColor" />
          <ellipse cx="12" cy="8" rx="6.5" ry="2.75" fill="currentColor" />
          <path d="M5.5 4h13v4h-13V4Z" fill="currentColor" />
          <ellipse cx="12" cy="8" rx="6.5" ry="2.75" fill="currentColor" />
        </svg>
      );
    case "donations":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={common} aria-hidden>
          <path
            d="M12 21s-6.5-4.35-6.5-9.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 6.5 4.5C18.5 16.65 12 21 12 21Z"
            fill="currentColor"
          />
        </svg>
      );
    case "expenses":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={common} aria-hidden>
          <path
            d="M4 4h16v4H4V4Zm0 6h10v2H4v-2Zm0 4h16v2H4v-2Zm0 4h7v2H4v-2Z"
            fill="currentColor"
          />
          <path d="M16 14h6v6h-6v-6Z" fill="currentColor" />
        </svg>
      );
    case "expenseTypes":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={common} aria-hidden>
          <rect x="3" y="5" width="18" height="3" rx="1.5" fill="currentColor" />
          <rect x="3" y="10.5" width="12" height="3" rx="1.5" fill="currentColor" />
          <rect x="3" y="16" width="15" height="3" rx="1.5" fill="currentColor" />
        </svg>
      );
    case "voidApprovals":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={common} aria-hidden>
          <path
            d="M12 2 4 5v6.5c0 4.5 3.2 8.7 8 10.1 4.8-1.4 8-5.6 8-10.1V5l-8-3Z"
            fill="currentColor"
          />
          <path
            d="M16.28 9.22a.75.75 0 0 1 0 1.06l-4.5 4.5a.75.75 0 0 1-1.06 0l-2-2a.75.75 0 1 1 1.06-1.06l1.47 1.47 3.97-3.97a.75.75 0 0 1 1.06 0Z"
            fill="currentColor"
            fillRule="evenodd"
            clipRule="evenodd"
          />
        </svg>
      );
    case "voidRequest":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={common} aria-hidden>
          <path
            d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Zm0 1.4L18.6 9H15a1 1 0 0 1-1-1V3.4ZM8 13h8v2H8v-2Zm0-4h8v2H8V9Z"
            fill="currentColor"
          />
        </svg>
      );
    case "events":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={common} aria-hidden>
          <path
            d="M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm0 16H5V10h14v10Zm-9-6h2v2h-2v-2Zm0-4h2v2h-2v-2Z"
            fill="currentColor"
          />
        </svg>
      );
    case "reportFinancial":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={common} aria-hidden>
          <path d="M4 19h3v-9H4v9Zm6.5 0h3V5h-3v14Zm6.5 0h3v-7h-3v7Z" fill="currentColor" />
        </svg>
      );
    case "reportAttendance":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={common} aria-hidden>
          <path
            d="M4 17V8l3 2 3-4 3 3 3-5 4 3v10H4Z"
            fill="currentColor"
            opacity="0.25"
          />
          <path
            d="M4 16.5 7 13l3 3.5 3-5 3 2.5 4-3.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <circle cx="7" cy="13" r="1.35" fill="currentColor" />
          <circle cx="13" cy="12" r="1.35" fill="currentColor" />
          <circle cx="16" cy="14" r="1.35" fill="currentColor" />
          <circle cx="20" cy="10.5" r="1.35" fill="currentColor" />
        </svg>
      );
    case "workbook":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={common} aria-hidden>
          <path
            d="M4 3h16a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm1 2v14h6V5H5Zm8 0v6h6V5h-6Zm0 8v6h6v-6h-6Z"
            fill="currentColor"
          />
        </svg>
      );
    case "logs":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={common} aria-hidden>
          <path
            d="M5 3h11l3 3v15a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm2 6h10v2H7V9Zm0 4h10v2H7v-2Zm0 4h7v2H7v-2Z"
            fill="currentColor"
          />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={common} aria-hidden>
          <path d="M4 6h16v2H4V6Zm0 5h16v2H4v-2Zm0 5h10v2H4v-2Z" fill="currentColor" />
        </svg>
      );
  }
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
            icon: "expenseTypes" as const,
            roles: ["ADMIN"] as Role[],
          },
          {
            href: "/void-requests",
            label: "Void approvals",
            icon: "voidApprovals" as const,
            roles: ["ADMIN"] as Role[],
            badgeCount: props.pendingVoidCount,
          },
        ]
      : []),
    ...(canRequestFinancialVoid(role)
      ? [
          {
            href: "/void-request",
            label: "Void request",
            icon: "voidRequest" as const,
            roles: ["STAFF", "TREASURER"] as Role[],
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
    {
      href: "/workbook",
      label: "Workbook Plan",
      icon: "workbook",
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
            {roleLabel(role)}
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

