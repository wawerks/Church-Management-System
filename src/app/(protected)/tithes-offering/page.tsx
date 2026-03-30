import Link from "next/link";
import { requireRole, requireSession } from "@/lib/auth";
import { canMutateDonations } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/generated/prisma/enums";
import { requestVoidServiceIncomeAction, voidServiceIncomeAction } from "./actions";
import { DeleteSubmitButton, GetSubmitButton, PendingGetForm } from "@/components/form-buttons";
import { AddServiceIncomeModal } from "@/components/AddServiceIncomeModal";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export default async function TithesOfferingPage(props: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole(["ADMIN", "PASTOR", "STAFF", "TREASURER"] satisfies Role[]);
  const session = await requireSession();
  const canEdit = canMutateDonations(session.role);
  const isAdmin = session.role === "ADMIN";

  const searchParams = await props.searchParams;
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthNumber = now.getMonth() + 1; // 1-12

  const yearRaw = searchParams?.year;
  const monthRaw = searchParams?.month;
  const hasAnyFilter = typeof yearRaw === "string" || typeof monthRaw === "string";

  const selectedYear =
    typeof yearRaw === "string" && /^\d{4}$/.test(yearRaw) ? Number(yearRaw) : currentYear;

  const selectedMonth =
    typeof monthRaw === "string" && monthRaw !== "all" && /^\d{1,2}$/.test(monthRaw)
      ? (() => {
          const m = Number(monthRaw);
          return m >= 1 && m <= 12 ? pad2(m) : "all";
        })()
      : monthRaw === "all"
        ? "all"
        : "all";

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const selectionLabel =
    !hasAnyFilter
      ? "Overall"
      : selectedMonth === "all"
        ? String(selectedYear)
        : `${monthNames[Number(selectedMonth) - 1]} ${selectedYear}`;

  let dbReady = true;
  let rows: Array<{ id: string; serviceDate: Date; amount: string }> = [];
  let total = 0;

  try {
    const rangeStart =
      !hasAnyFilter
        ? new Date(0)
        : selectedMonth === "all"
          ? new Date(selectedYear, 0, 1, 0, 0, 0, 0)
          : new Date(Number(selectedYear), Number(selectedMonth) - 1, 1, 0, 0, 0, 0);

    const rangeEnd =
      !hasAnyFilter
        ? new Date(3000, 0, 1, 0, 0, 0, 0)
        : selectedMonth === "all"
          ? new Date(selectedYear + 1, 0, 1, 0, 0, 0, 0)
          : new Date(Number(selectedYear), Number(selectedMonth), 1, 0, 0, 0, 0);

    const [list, agg] = await Promise.all([
      prisma.serviceIncome.findMany({
        where: { isDeleted: false, serviceDate: { gte: rangeStart, lt: rangeEnd } },
        orderBy: { serviceDate: "desc" },
        take: 50,
      }),
      prisma.serviceIncome.aggregate({
        where: { isDeleted: false, serviceDate: { gte: rangeStart, lt: rangeEnd } },
        _sum: { amount: true },
      }),
    ]);

    rows = list.map((r) => ({
      id: r.id,
      serviceDate: r.serviceDate,
      amount: r.amount.toString(),
    }));
    total = Number(agg._sum.amount ?? 0);
  } catch {
    dbReady = false;
  }

  let pendingVoidServiceIncomeIds = new Set<string>();
  if (dbReady && canEdit && rows.length > 0) {
    try {
      const pend = await prisma.voidRequest.findMany({
        where: {
          entity: "SERVICE_INCOME",
          status: "PENDING",
          entityId: { in: rows.map((r) => r.id) },
        },
        select: { entityId: true },
      });
      pendingVoidServiceIncomeIds = new Set(pend.map((p) => p.entityId));
    } catch {
      // ignore
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Tithes & Offering</h1>
          <p className="mt-1 text-sm text-slate-600">
            Total income per Sunday service, separate from donations.
          </p>
        </div>
        {canEdit ? (
          <AddServiceIncomeModal />
        ) : null}
      </div>

      {!dbReady ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Database isn&apos;t ready yet. Run Prisma migration first.
        </div>
      ) : null}

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <PendingGetForm method="GET" className="grid gap-3 md:grid-cols-5">
          <label className="block md:col-span-2">
            <div className="mb-1 text-sm font-medium text-slate-700">Year</div>
            <select
              name="year"
              defaultValue={String(selectedYear)}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              {Array.from({ length: 6 }, (_, i) => currentYear - i).map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>

          <label className="block md:col-span-2">
            <div className="mb-1 text-sm font-medium text-slate-700">Month</div>
            <select
              name="month"
              defaultValue={selectedMonth}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="all">All months</option>
              {Array.from({ length: 12 }, (_, i) => {
                const m = i + 1;
                return (
                  <option key={m} value={pad2(m)}>
                    {monthNames[i]}
                  </option>
                );
              })}
            </select>
          </label>

          <div className="md:col-span-1 flex items-end gap-2">
            <GetSubmitButton
              pendingLabel="Applying..."
              className="h-10 rounded-md bg-black px-3 text-sm font-medium text-white hover:bg-black/90"
            >
              Apply
            </GetSubmitButton>
            <Link
              href="/tithes-offering"
              className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center"
            >
              Reset
            </Link>
          </div>
        </PendingGetForm>
      </div>

      <div className="grid gap-4 md:grid-cols-1">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-sm font-medium text-slate-600">
            Total Tithes & Offering ({selectionLabel})
          </div>
          <div className="mt-2 text-3xl font-semibold">
            {dbReady
              ? total.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })
              : "-"}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-slate-700">
                <th className="px-4 py-3 font-medium">Sunday Service Date</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                {canEdit ? (
                  <th className="px-4 py-3 font-medium">Actions</th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={canEdit ? 3 : 2}
                    className="px-4 py-6 text-center text-slate-500"
                  >
                    No records yet.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">
                      {r.serviceDate.toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 font-semibold">
                      {Number(r.amount).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    {canEdit ? (
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          {pendingVoidServiceIncomeIds.has(r.id) ? (
                            <span className="text-xs font-medium text-amber-800">
                              Void pending admin approval
                            </span>
                          ) : null}
                          <form
                            action={
                              isAdmin
                                ? voidServiceIncomeAction.bind(null, r.id)
                                : requestVoidServiceIncomeAction.bind(null, r.id)
                            }
                          >
                            <input type="hidden" name="voidReason" defaultValue="" />
                            <DeleteSubmitButton
                              requireReason
                              confirmMessage={
                                isAdmin
                                  ? "Are you sure you want to void this service income entry?"
                                  : "Submit a void request? This entry stays active until an administrator approves."
                              }
                              reasonPromptMessage={
                                isAdmin
                                  ? "Please provide a reason for voiding this service income:"
                                  : "Reason for this void request (admin will review):"
                              }
                            >
                              {isAdmin ? "Void" : "Request void"}
                            </DeleteSubmitButton>
                          </form>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
