import Link from "next/link";
import type { ReactNode } from "react";
import type { Role } from "@/generated/prisma/enums";
import { LogoutButton } from "@/components/LogoutButton";
import { canManageUsers } from "@/lib/permissions";

type IconName =
  | "dashboard"
  | "users"
  | "members"
  | "attendance"
  | "income"
  | "donations"
  | "expenses"
  | "events"
  | "reportFinancial"
  | "reportAttendance";

function NavIcon({ name }: { name: IconName }) {
  const common = "h-4 w-4 text-current";
  if (name === "dashboard") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={common}>
        <path d="M3 13h8V3H3v10Zm10 8h8V3h-8v18ZM3 21h8v-6H3v6Z" fill="currentColor" />
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
  return (
    <svg viewBox="0 0 24 24" fill="none" className={common}>
      <path d="M3 3h18v6H3V3Zm0 8h18v10H3V11Zm2 2v6h14v-6H5Z" fill="currentColor" />
    </svg>
  );
}

function NavItem(props: { href: string; label: string; icon: IconName }) {
  return (
    <li>
      <Link
        href={props.href}
        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white/10 hover:text-white"
      >
        <NavIcon name={props.icon} />
        {props.label}
      </Link>
    </li>
  );
}

function Divider() {
  return <div className="my-3 h-px bg-slate-200" />;
}

export function Sidebar(props: {
  role: Role;
  userName?: string;
  children?: ReactNode;
}) {
  const role = props.role;

  const topNav: Array<{ href: string; label: string; icon: IconName; roles?: Role[] }> = [
    { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
    ...(canManageUsers(role)
      ? [{ href: "/users", label: "Users & roles" as const, icon: "users" as const }]
      : []),
    { href: "/members", label: "Members", icon: "members", roles: ["ADMIN", "PASTOR", "STAFF"] },
    { href: "/attendance", label: "Attendance", icon: "attendance", roles: ["ADMIN", "PASTOR", "STAFF"] },
    {
      href: "/tithes-offering",
      label: "Tithes & Offering",
      icon: "income",
      roles: ["ADMIN", "PASTOR", "STAFF"],
    },
    { href: "/donations", label: "Donations", icon: "donations", roles: ["ADMIN", "PASTOR", "STAFF"] },
    { href: "/expenses", label: "Expenses", icon: "expenses", roles: ["ADMIN", "PASTOR", "STAFF"] },
    ...(canManageUsers(role)
      ? [
          {
            href: "/expenses/types",
            label: "Expense Types",
            icon: "expenses" as const,
            roles: ["ADMIN"] as Role[],
          },
        ]
      : []),
    { href: "/events", label: "Events", icon: "events", roles: ["ADMIN", "PASTOR"] },
    {
      href: "/reports/financial",
      label: "Financial Reports",
      icon: "reportFinancial",
      roles: ["ADMIN", "PASTOR", "STAFF"],
    },
    {
      href: "/reports/attendance",
      label: "Attendance Reports",
      icon: "reportAttendance",
      roles: ["ADMIN", "PASTOR", "STAFF"],
    },
  ];

  return (
    <aside className="sticky top-0 hidden h-screen w-72 shrink-0 border-r border-slate-200/90 bg-white/95 backdrop-blur md:block">
      <div className="flex h-full flex-col overflow-hidden p-4">
        <div className="pb-4">
          <div className="text-lg font-semibold tracking-tight text-slate-900">
            Church Admin
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {props.userName ? `Signed in as ${props.userName}` : `Role: ${role}`}
          </div>
        </div>

        <nav>
          <ul className="space-y-1">
            {topNav
              .filter((i) => !i.roles || i.roles.includes(role))
              .map((i) => (
                <NavItem key={i.href} href={i.href} label={i.label} icon={i.icon} />
              ))}
          </ul>
        </nav>

        <Divider />

        <div className="mt-auto">
          <LogoutButton />
        </div>
      </div>
    </aside>
  );
}

