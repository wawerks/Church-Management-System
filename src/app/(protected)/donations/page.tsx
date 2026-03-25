import Link from "next/link";
import { requireRole, requireSession } from "@/lib/auth";
import { canMutateDonations } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import type { Role, DonationType } from "@/generated/prisma/enums";
import { deleteDonationAction } from "./actions";
import {
  DeleteSubmitButton,
  GetSubmitButton,
  PendingGetForm,
} from "@/components/form-buttons";
import type { Prisma } from "@/generated/prisma/client";
import { AddDonationModal } from "@/components/AddDonationModal";

function parseDateInput(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const s = value.trim();
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function startOfMonth(d: Date) {
  const x = new Date(d);
  x.setDate(1);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfMonth(d: Date) {
  const x = new Date(d);
  x.setMonth(x.getMonth() + 1, 0);
  x.setHours(23, 59, 59, 999);
  return x;
}

function formatMoney(value: number) {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default async function DonationsPage(props: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole(["ADMIN", "PASTOR", "STAFF", "TREASURER"] satisfies Role[]);
  const session = await requireSession();
  const canEdit = canMutateDonations(session.role);
  const searchParams = await props.searchParams;

  // Suggestions for the "Member / Donator" picker.
  let memberSuggestions: Array<{ id: string; name: string }> = [];
  try {
    const list = await prisma.member.findMany({
      orderBy: { lastName: "asc" },
      select: { id: true, firstName: true, lastName: true },
      take: 250,
    });
    memberSuggestions = list.map((m) => ({
      id: m.id,
      name: `${m.firstName} ${m.lastName}`.trim(),
    }));
  } catch {
    // ignore
  }

  const today = new Date();

  const typeRaw = searchParams?.type;
  const type =
    typeof typeRaw === "string" &&
    ["DONATION", "OTHERS"].includes(typeRaw)
      ? (typeRaw as DonationType)
      : undefined;

  const from = parseDateInput(searchParams?.from);
  const to = parseDateInput(searchParams?.to);

  let where: Prisma.DonationWhereInput = {};
  if (type) where = { ...where, type };
  if (from || to) {
    where = {
      ...where,
      date: {
        ...(from ? { gte: startOfDay(from) } : {}),
        ...(to ? { lte: endOfDay(to) } : {}),
      },
    };
  }

  let dbReady = true;
  let donations:
    | Array<{
        id: string;
        amount: string;
        type: string;
        date: Date;
        memberName: string;
      }>
    | [] = [];
  let totalInRange = 0;
  let todayTotal = 0;
  let monthTotal = 0;
  let breakdown:
    | Array<{ type: DonationType; amount: string }>
    | [] = [];

  try {
    const [list, sumRange, sumToday, sumMonth] =
      await Promise.all([
      prisma.donation.findMany({
        where,
        orderBy: { date: "desc" },
        take: 50,
        include: { member: true },
      }),
      prisma.donation.aggregate({
        _sum: { amount: true },
        where,
      }),
      prisma.donation.aggregate({
        _sum: { amount: true },
        where: { ...where, date: { gte: startOfDay(today), lte: endOfDay(today) } },
      }),
      prisma.donation.aggregate({
        _sum: { amount: true },
        where: {
          ...where,
          date: { gte: startOfMonth(today), lte: endOfMonth(today) },
        },
      }),
    ]);

    donations = list.map((d) => ({
      id: d.id,
      amount: d.amount.toString(),
      type: d.type,
      date: d.date,
      memberName: `${d.member.firstName} ${d.member.lastName}`,
    }));
    totalInRange = Number(sumRange._sum.amount ?? 0);
    todayTotal = Number(sumToday._sum.amount ?? 0);
    monthTotal = Number(sumMonth._sum.amount ?? 0);

    // Simple breakdown by donation type within filters/date range.
    const types: DonationType[] = ["DONATION", "OTHERS"];
    breakdown = await Promise.all(
      types.map(async (t) => {
        const agg = await prisma.donation.aggregate({
          _sum: { amount: true },
          where: { ...where, type: t },
        });
        return { type: t, amount: (agg._sum.amount ?? 0).toString() };
      }),
    );
  } catch {
    dbReady = false;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Donations</h1>
          <p className="mt-1 text-sm text-slate-600">
            {canEdit
              ? "Track member donations and other donation entries."
              : "View donations (Pastor: read-only)."}
          </p>
        </div>
        {canEdit ? (
          <AddDonationModal members={memberSuggestions} />
        ) : null}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <PendingGetForm method="GET" className="grid gap-3 md:grid-cols-4">
          <label className="block">
            <div className="mb-1 text-sm font-medium text-slate-700">Type</div>
            <select
              name="type"
              defaultValue={type ?? ""}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="">All types</option>
              <option value="DONATION">Donation</option>
              <option value="OTHERS">Others</option>
            </select>
          </label>

          <label className="block">
            <div className="mb-1 text-sm font-medium text-slate-700">From</div>
            <input
              type="date"
              name="from"
              defaultValue={
                typeof searchParams?.from === "string"
                  ? searchParams?.from
                  : undefined
              }
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            />
          </label>

          <label className="block">
            <div className="mb-1 text-sm font-medium text-slate-700">To</div>
            <input
              type="date"
              name="to"
              defaultValue={
                typeof searchParams?.to === "string"
                  ? searchParams?.to
                  : undefined
              }
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            />
          </label>

          <div className="flex items-end gap-2">
            <GetSubmitButton
              pendingLabel="Applying…"
              className="h-10 rounded-md bg-black px-3 text-sm font-medium text-white hover:bg-black/90"
            >
              Apply
            </GetSubmitButton>
            <Link
              href="/donations"
              className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center"
            >
              Reset
            </Link>
          </div>
        </PendingGetForm>
      </div>

      {!dbReady ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Database isn’t ready yet. Set up MySQL + run Prisma migrations.
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-sm font-medium text-slate-600">
            Total (Filtered Range)
          </div>
          <div className="mt-2 text-3xl font-semibold">
            {dbReady ? formatMoney(totalInRange) : "—"}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-sm font-medium text-slate-600">Today</div>
          <div className="mt-2 text-3xl font-semibold">
            {dbReady ? formatMoney(todayTotal) : "—"}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-sm font-medium text-slate-600">This Month</div>
          <div className="mt-2 text-3xl font-semibold">
            {dbReady ? formatMoney(monthTotal) : "—"}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 text-sm font-semibold text-slate-800">
          Breakdown
        </div>
        <div className="grid gap-2 md:grid-cols-3">
          {breakdown.map((b) => (
            <div
              key={b.type}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
            >
              <div className="text-xs font-medium text-slate-600">
                {b.type}
              </div>
              <div className="mt-1 text-lg font-semibold">
                {dbReady ? formatMoney(Number(b.amount)) : "—"}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-slate-700">
                <th className="px-4 py-3 font-medium">Member</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Date</th>
                {canEdit ? (
                  <th className="px-4 py-3 font-medium">Actions</th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {donations.length === 0 ? (
                <tr>
                  <td
                    colSpan={canEdit ? 5 : 4}
                    className="px-4 py-6 text-center text-slate-500"
                  >
                    No donations found.
                  </td>
                </tr>
              ) : (
                donations.map((d) => (
                  <tr key={d.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium">{d.memberName}</td>
                    <td className="px-4 py-3 text-slate-600">{d.type}</td>
                    <td className="px-4 py-3 font-semibold">
                      {formatMoney(Number(d.amount))}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {d.date.toLocaleDateString()}
                    </td>
                    {canEdit ? (
                      <td className="px-4 py-3">
                        <form
                          action={deleteDonationAction.bind(null, d.id)}
                        >
                          <DeleteSubmitButton />
                        </form>
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

