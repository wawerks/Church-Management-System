import Link from "next/link";
import type { ReactNode } from "react";
import type { Role } from "@/generated/prisma/enums";
import { LogoutButton } from "@/components/LogoutButton";
import { canManageUsers } from "@/lib/permissions";

function NavItem(props: { href: string; label: string }) {
  return (
    <li>
      <Link
        href={props.href}
        className="block rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
      >
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

  const topNav: Array<{ href: string; label: string; roles?: Role[] }> = [
    { href: "/dashboard", label: "Dashboard" },
    ...(canManageUsers(role)
      ? [{ href: "/users", label: "Users & roles" as const }]
      : []),
    { href: "/members", label: "Members", roles: ["ADMIN", "PASTOR", "STAFF"] },
    { href: "/attendance", label: "Attendance", roles: ["ADMIN", "PASTOR", "STAFF"] },
    {
      href: "/tithes-offering",
      label: "Tithes & Offering",
      roles: ["ADMIN", "PASTOR", "STAFF"],
    },
    { href: "/donations", label: "Donations", roles: ["ADMIN", "PASTOR", "STAFF"] },
    { href: "/expenses", label: "Expenses", roles: ["ADMIN", "PASTOR", "STAFF"] },
    ...(canManageUsers(role)
      ? [
          {
            href: "/expenses/types",
            label: "Expense Types",
            roles: ["ADMIN"] as Role[],
          },
        ]
      : []),
    { href: "/events", label: "Events", roles: ["ADMIN", "PASTOR"] },
    {
      href: "/reports/financial",
      label: "Financial Reports",
      roles: ["ADMIN", "PASTOR", "STAFF"],
    },
    {
      href: "/reports/attendance",
      label: "Attendance Reports",
      roles: ["ADMIN", "PASTOR", "STAFF"],
    },
  ];

  return (
    <aside className="hidden w-72 shrink-0 border-r border-slate-200 bg-white md:block">
      <div className="flex h-full flex-col p-4">
        <div className="pb-4">
          <div className="text-lg font-semibold tracking-tight">Church Admin</div>
          <div className="mt-1 text-xs text-slate-500">
            {props.userName ? `Signed in as ${props.userName}` : `Role: ${role}`}
          </div>
        </div>

        <nav>
          <ul className="space-y-1">
            {topNav
              .filter((i) => !i.roles || i.roles.includes(role))
              .map((i) => (
                <NavItem key={i.href} href={i.href} label={i.label} />
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

