import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type { Role } from "@/generated/prisma/enums";
import { approveVoidRequestAction, declineVoidRequestAction } from "./actions";
import { SubmitButton } from "@/components/form-buttons";

function formatMoney(value: number) {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function toMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

type VoidRowDetailParts = { before: string; amount: string; after: string };

function entityLabel(entity: string) {
  switch (entity) {
    case "DONATION":
      return "Donation";
    case "SERVICE_INCOME":
      return "Service income";
    case "EXPENSE":
      return "Expense";
    default:
      return entity;
  }
}

function entityChipClasses(entity: string) {
  switch (entity) {
    case "DONATION":
      return "border-indigo-100 bg-indigo-50 text-indigo-800";
    case "SERVICE_INCOME":
      return "border-sky-100 bg-sky-50 text-sky-800";
    case "EXPENSE":
      return "border-emerald-100 bg-emerald-50 text-emerald-800";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

type PendingVoidRequest = Prisma.VoidRequestGetPayload<{
  include: { requestedBy: { select: { name: true; email: true } } };
}>;

type RecentVoidRequest = Prisma.VoidRequestGetPayload<{
  include: {
    requestedBy: { select: { name: true } };
    reviewedBy: { select: { name: true } };
  };
}>;

export default async function VoidRequestsPage() {
  await requireRole(["ADMIN"] satisfies Role[]);

  let dbReady = true;
  let dbError: string | null = null;
  let pending: PendingVoidRequest[] = [];
  try {
    pending = await prisma.voidRequest.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      include: {
        requestedBy: { select: { name: true, email: true } },
      },
    });
  } catch (e) {
    dbReady = false;
    dbError =
      process.env.NODE_ENV === "development" && e instanceof Error
        ? e.message
        : null;
  }

  const rows = await Promise.all(
    pending.map(async (req) => {
      if (req.entity === "DONATION") {
        const d = await prisma.donation.findFirst({
          where: { id: req.entityId, isDeleted: false },
          include: { member: { select: { firstName: true, lastName: true } } },
        });
        if (!d) {
          return {
            req,
            summary: "Record missing or already voided",
            detailParts: null as VoidRowDetailParts | null,
            href: "/donations",
          };
        }
        const name = `${d.member.firstName} ${d.member.lastName}`.trim();
        const amountStr = formatMoney(Number(d.amount));
        return {
          req,
          summary: `Donation — ${name}`,
          detailParts: {
            before: `${d.type} • `,
            amount: amountStr,
            after: ` • ${d.date.toLocaleDateString()}`,
          },
          href: "/donations",
        };
      }
      if (req.entity === "SERVICE_INCOME") {
        const s = await prisma.serviceIncome.findFirst({
          where: { id: req.entityId, isDeleted: false },
        });
        if (!s) {
          return {
            req,
            summary: "Record missing or already voided",
            detailParts: null,
            href: "/tithes-offering",
          };
        }
        const amountStr = formatMoney(Number(s.amount));
        return {
          req,
          summary: "Service income",
          detailParts: {
            before: "",
            amount: amountStr,
            after: ` • ${s.serviceDate.toLocaleDateString()}`,
          },
          href: "/tithes-offering",
        };
      }
      const e = await prisma.expense.findFirst({
        where: { id: req.entityId, isDeleted: false },
      });
      if (!e) {
        return {
          req,
          summary: "Record missing or already voided",
          detailParts: null,
          href: "/expenses",
        };
      }
      const amountStr = formatMoney(Number(e.amount));
      const expenseHref = `/expenses?view=expenses&budgetMonth=${encodeURIComponent(
        toMonthKey(e.date),
      )}&highlight=${encodeURIComponent(e.id)}`;
      return {
        req,
        summary: `Expense — ${e.type}`,
        detailParts: {
          before: "",
          amount: amountStr,
          after: ` • ${e.date.toLocaleDateString()} • ${e.receivedBy}`,
        },
        href: expenseHref,
      };
    }),
  );

  let recent: RecentVoidRequest[] = [];
  if (dbReady) {
    try {
      recent = await prisma.voidRequest.findMany({
        where: { status: { not: "PENDING" } },
        orderBy: { reviewedAt: "desc" },
        take: 25,
        include: {
          requestedBy: { select: { name: true } },
          reviewedBy: { select: { name: true } },
        },
      });
    } catch {
      // keep empty recent list
      recent = [];
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <header className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              Void approvals
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Staff submits a request with a reason. Review it here and approve or decline.
            </p>
          </div>
          {dbReady ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <div className="text-xs font-medium text-slate-600">Pending</div>
              <div className="text-2xl font-semibold text-slate-900 tabular-nums">
                {rows.length}
              </div>
            </div>
          ) : null}
        </div>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Pending requests</h2>
          {dbReady ? (
            <div className="text-xs text-slate-600">
              Approve to void the record. Decline keeps it active.
            </div>
          ) : null}
        </div>
        {!dbReady ? (
          <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            Void requests aren&apos;t ready yet. Ensure Prisma migrations are applied
            and restart the dev server.
            {dbError ? (
              <div className="mt-2 font-mono text-xs text-amber-950/90">
                {dbError}
              </div>
            ) : null}
          </div>
        ) : rows.length === 0 ? (
          <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-5 text-center">
            <div className="text-sm font-medium text-slate-700">Nothing to review</div>
            <div className="mt-1 text-sm text-slate-600">
              When staff submits a void request, it will appear here.
            </div>
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left text-slate-700">
                  <th className="px-4 py-3 font-medium">Request</th>
                  <th className="px-4 py-3 font-medium">Reason</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {rows.map(({ req, summary, detailParts, href }, idx) => (
                  <tr
                    key={req.id}
                    className={`align-top ${idx % 2 === 0 ? "bg-white" : "bg-amber-50/50"}`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-1 text-xs font-semibold tabular-nums ${entityChipClasses(
                            req.entity,
                          )}`}
                        >
                          {entityLabel(req.entity)}
                        </span>
                        <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-900">
                          Pending
                        </span>
                      </div>

                      <div className="mt-2 space-y-1">
                        <div className="font-semibold text-slate-900">
                          {summary}
                        </div>
                        {detailParts ? (
                          <div className="text-sm text-slate-600">
                            {detailParts.before}
                            <span className="mx-0.5 inline-flex items-center rounded-md bg-amber-100 px-1.5 py-0.5 font-bold tabular-nums text-amber-950 ring-1 ring-amber-300/80">
                              {detailParts.amount}
                            </span>
                            {detailParts.after}
                          </div>
                        ) : null}
                      </div>

                      <div className="mt-2 text-xs text-slate-500">
                        Requested by{" "}
                        <span className="font-medium text-slate-700">
                          {req.requestedBy.name || req.requestedBy.email}
                        </span>{" "}
                        • {req.createdAt.toLocaleString()}
                      </div>

                      <Link
                        href={href}
                        className="mt-2 inline-block text-sm font-medium text-[#2f7d98] hover:underline"
                      >
                        View source record
                      </Link>
                    </td>

                    <td className="px-4 py-3 text-center" style={{ width: "360px" }}>
                      <div className="rounded-md border border-amber-100 bg-amber-50/90 p-3">
                        <div className="text-xs font-semibold text-amber-950">
                          Reason
                        </div>
                        <div className="mt-1 whitespace-pre-wrap text-sm text-amber-950">
                          {req.reason}
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-right align-top">
                      <div className="relative flex w-[268px] items-end justify-end gap-3 pt-10">
                        <form
                          action={approveVoidRequestAction.bind(null, req.id)}
                        >
                          <SubmitButton
                            pendingLabel="Approving…"
                            className="h-10 w-32 rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
                          >
                            Approve
                          </SubmitButton>
                        </form>

                        <form
                          action={declineVoidRequestAction.bind(null, req.id)}
                        >
                          <label htmlFor={`decline-${req.id}`} className="sr-only">
                            Decline note (optional)
                          </label>
                          <input
                            id={`decline-${req.id}`}
                            name="declineNote"
                            placeholder="Optional decline note"
                            className="absolute left-0 -top-1 z-10 w-full h-10 rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-200"
                          />
                          <SubmitButton
                            pendingLabel="Declining…"
                            className="h-10 w-32 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                          >
                            Decline
                          </SubmitButton>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {recent.length > 0 ? (
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-slate-900">Recently decided</h2>
          <ul className="mt-3 divide-y divide-slate-100 text-sm">
            {recent.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-baseline justify-between gap-2 py-2"
              >
                <span className="text-slate-700">
                  {entityLabel(r.entity)} • {r.requestedBy.name}
                </span>
                <span
                  className={
                    r.status === "APPROVED" ? "font-semibold text-emerald-700" : "text-slate-600"
                  }
                >
                  {r.status}
                  {r.reviewedBy ? ` • by ${r.reviewedBy.name}` : ""}
                  {r.reviewedAt ? ` • ${r.reviewedAt.toLocaleString()}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
