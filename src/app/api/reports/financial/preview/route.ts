import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import type { Role } from "@/generated/prisma/enums";

type GroupBy = "daily" | "monthly" | "yearly";

function isAllowedRole(role: string): role is Role {
  return role === "ADMIN" || role === "PASTOR" || role === "STAFF" || role === "TREASURER";
}

function toInputDate(value: string | null) {
  if (!value) return null;
  const s = value.trim();
  if (!s) return null;
  return s;
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

function keyFor(d: Date, groupBy: GroupBy) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  if (groupBy === "daily") return `${y}-${m}-${day}`;
  if (groupBy === "monthly") return `${y}-${m}`;
  return `${y}`;
}

export async function GET(req: Request) {
  const session = await getServerSession();
  if (!session || !isAllowedRole(session.role)) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  const params = new URL(req.url).searchParams;
  const groupBy = (params.get("groupBy") ?? "monthly") as GroupBy;
  const fromStr = toInputDate(params.get("from"));
  const toStr = toInputDate(params.get("to"));

  const allowedGroupBy: GroupBy[] = ["daily", "monthly", "yearly"];
  if (!allowedGroupBy.includes(groupBy)) {
    return NextResponse.json({ ok: false, message: "Invalid period." }, { status: 400 });
  }

  const today = new Date();
  const fromDate = fromStr ? new Date(fromStr) : new Date(today.getTime());
  const toDate = toStr ? new Date(toStr) : today;
  const start = startOfDay(fromDate);
  const end = endOfDay(toDate);

  try {
    const [donations, serviceIncome, expenses] = await Promise.all([
      prisma.donation.findMany({
        where: { date: { gte: start, lte: end } },
        select: { date: true, amount: true },
      }),
      prisma.serviceIncome.findMany({
        where: { serviceDate: { gte: start, lte: end } },
        select: { serviceDate: true, amount: true },
      }),
      prisma.expense.findMany({
        where: { date: { gte: start, lte: end } },
        select: { type: true, amount: true, receivedBy: true },
      }),
    ]);

    const byKey: Record<
      string,
      { period: string; tithesOffering: number; donations: number; totalIncome: number }
    > = {};

    for (const s of serviceIncome) {
      const k = keyFor(s.serviceDate, groupBy);
      if (!byKey[k]) byKey[k] = { period: k, tithesOffering: 0, donations: 0, totalIncome: 0 };
      const amt = Number(s.amount ?? 0);
      byKey[k].tithesOffering += amt;
      byKey[k].totalIncome += amt;
    }
    for (const d of donations) {
      const k = keyFor(d.date, groupBy);
      if (!byKey[k]) byKey[k] = { period: k, tithesOffering: 0, donations: 0, totalIncome: 0 };
      const amt = Number(d.amount ?? 0);
      byKey[k].donations += amt;
      byKey[k].totalIncome += amt;
    }

    const incomeRows = Object.values(byKey).sort((a, b) => a.period.localeCompare(b.period));

    const expenseAgg: Record<
      string,
      { type: string; receivedBy: string; amount: number }
    > = {};
    for (const e of expenses) {
      const receivedBy = (e.receivedBy ?? "").trim() || "Unknown";
      const k = `${e.type}\0${receivedBy}`;
      if (!expenseAgg[k]) {
        expenseAgg[k] = { type: e.type, receivedBy, amount: 0 };
      }
      expenseAgg[k].amount += Number(e.amount ?? 0);
    }
    const expenseRows = Object.values(expenseAgg).sort((a, b) =>
      a.type !== b.type
        ? a.type.localeCompare(b.type)
        : a.receivedBy.localeCompare(b.receivedBy),
    );

    const totalTithesOffering = serviceIncome.reduce((sum, x) => sum + Number(x.amount ?? 0), 0);
    const totalDonations = donations.reduce((sum, x) => sum + Number(x.amount ?? 0), 0);
    const totalExpenses = expenses.reduce((sum, x) => sum + Number(x.amount ?? 0), 0);
    const totalIncome = totalTithesOffering + totalDonations;
    const netRemaining = totalIncome - totalExpenses;

    return NextResponse.json({
      ok: true,
      groupBy,
      start: start.toISOString(),
      end: end.toISOString(),
      incomeRows,
      expenseRows,
      totals: {
        totalTithesOffering,
        totalDonations,
        totalExpenses,
        totalIncome,
        netRemaining,
      },
    });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Failed to load financial preview." },
      { status: 500 },
    );
  }
}
