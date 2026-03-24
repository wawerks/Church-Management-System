import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { Sidebar } from "@/components/Sidebar";
import { LogoutButton } from "@/components/LogoutButton";
import type { Role } from "@/generated/prisma/enums";
import { canManageUsers } from "@/lib/permissions";

function MobileNav(props: { role: Role }) {
  const role = props.role;
  const items: Array<{ href: string; label: string; roles?: Role[] }> = [
    { href: "/dashboard", label: "Dashboard" },
    ...(canManageUsers(role)
      ? [{ href: "/users", label: "Users" as const }]
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
      ? [{ href: "/expenses/types", label: "Expense Types", roles: ["ADMIN"] as Role[] }]
      : []),
    { href: "/events", label: "Events", roles: ["ADMIN", "PASTOR"] },
    {
      href: "/reports/financial",
      label: "Fin. Reports",
      roles: ["ADMIN", "PASTOR", "STAFF"],
    },
    {
      href: "/reports/attendance",
      label: "Att. Reports",
      roles: ["ADMIN", "PASTOR", "STAFF"],
    },
  ];

  return (
    <div className="border-b bg-white md:hidden">
      <div className="flex items-center justify-between gap-3 px-3 py-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">Church Admin</div>
          <div className="truncate text-xs text-slate-600">{role}</div>
        </div>
        <LogoutButton />
      </div>

      <nav className="flex gap-2 overflow-x-auto px-3 pb-2">
        {items
          .filter((i) => !i.roles || i.roles.includes(role))
          .map((i) => (
            <Link
              key={i.href}
              href={i.href}
              className="shrink-0 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              {i.label}
            </Link>
          ))}
      </nav>
    </div>
  );
}

export default async function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await requireSession();

  return (
    <div className="app-shell h-screen overflow-hidden">
      <div className="flex h-full">
        <Sidebar role={session.role} userName={session.name} />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <MobileNav role={session.role} />
          <header className="hidden border-b border-slate-200/80 bg-white/90 px-6 py-4 backdrop-blur md:block">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold tracking-tight text-slate-900">
                  Church Admin
                </div>
                <div className="text-xs text-slate-600">{session.email}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-600">Role: {session.role}</div>
              </div>
            </div>
          </header>

          <main className="p-4">{children}</main>
        </div>
      </div>
    </div>
  );
}

