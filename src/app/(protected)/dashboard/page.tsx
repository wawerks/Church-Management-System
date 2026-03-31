import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AttendanceStatus } from "@/generated/prisma/enums";
import { canViewDashboardDonations } from "@/lib/permissions";
import type { Prisma } from "@/generated/prisma/client";

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

export default async function DashboardPage() {
  const session = await requireSession();
  const showDonations = canViewDashboardDonations(session.role);
  const today = new Date();

  let totalMembers = 0;
  let attendanceTodayPresent = 0;
  let monthlyDonations = 0;
  let recentDonations: Array<{
    id: string;
    amount: string;
    type: string;
    date: Date;
    memberName: string;
  }> = [];
  let recentAttendance: Array<{
    id: string;
    status: string;
    date: Date;
    memberName: string;
    eventTitle: string;
  }> = [];
  let dbReady = true;
  let dbError: string | null = null;

  try {
    const [memberCount, attendanceToday, monthDonations, donations, attendance] =
      await Promise.all([
        prisma.member.count(),
        prisma.attendance.count({
          where: {
            status: AttendanceStatus.PRESENT,
            date: {
              gte: startOfDay(today),
              lte: endOfDay(today),
            },
          },
        }),
        prisma.donation.aggregate({
          _sum: { amount: true },
          where: {
            isDeleted: false,
            date: {
              gte: startOfMonth(today),
              lte: endOfMonth(today),
            },
          },
        }),
        prisma.donation.findMany({
          where: { isDeleted: false },
          take: 5,
          orderBy: { date: "desc" },
          include: { member: true },
        }),
        prisma.attendance.findMany({
          take: 5,
          orderBy: { date: "desc" },
          include: { member: true, event: true },
        }),
      ]);

    totalMembers = memberCount;
    attendanceTodayPresent = attendanceToday;
    monthlyDonations = Number(monthDonations._sum.amount ?? 0);
    recentDonations = donations.map((d) => ({
      id: d.id,
      amount: d.amount.toString(),
      type: d.type,
      date: d.date,
      memberName: `${d.member.firstName} ${d.member.lastName}`,
    }));
    recentAttendance = attendance.map((a) => ({
      id: a.id,
      status: a.status,
      date: a.date,
      memberName: `${a.member.firstName} ${a.member.lastName}`,
      eventTitle: a.event.title,
    }));
  } catch (e) {
    dbReady = false;
    dbError =
      process.env.NODE_ENV === "development" && e instanceof Error
        ? e.message
        : null;
  }

  let pendingVoidCount = 0;
  if (dbReady && session.role === "ADMIN") {
    try {
      pendingVoidCount = await prisma.voidRequest.count({
        where: { status: "PENDING" },
      });
    } catch {
      // ignore
    }
  }

  type LatestVoidDecision = Prisma.VoidRequestGetPayload<{
    include: {
      reviewedBy: { select: { name: true } };
    };
  }>;

  let latestVoidDecision: LatestVoidDecision | null = null;
  if (dbReady && (session.role === "STAFF" || session.role === "TREASURER")) {
    try {
      latestVoidDecision = await prisma.voidRequest.findFirst({
        where: {
          requestedById: session.userId,
          status: { not: "PENDING" },
        },
        orderBy: { reviewedAt: "desc" },
        include: {
          reviewedBy: { select: { name: true } },
        },
      });
    } catch {
      latestVoidDecision = null;
    }
  }

  const latestVoidDecisionWithinWindow =
    latestVoidDecision?.reviewedAt &&
    latestVoidDecision.reviewedAt.getTime() >=
      new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).getTime();

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Quick overview for church staff.
        </p>
      </div>

      {!dbReady ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p>
            Database isn’t ready yet. Ensure MySQL is running,{" "}
            <code className="rounded bg-amber-100 px-1">DATABASE_URL</code> in{" "}
            <code className="rounded bg-amber-100 px-1">.env</code> matches your
            server, then run{" "}
            <code className="rounded bg-amber-100 px-1">npm run db:migrate</code>{" "}
            and restart the dev server.
          </p>
          {dbError ? (
            <p className="mt-2 font-mono text-xs text-amber-950/90">{dbError}</p>
          ) : null}
        </div>
      ) : null}

      {dbReady && session.role === "ADMIN" && pendingVoidCount > 0 ? (
        <div className="rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
          <Link
            href="/void-requests"
            className="font-semibold text-sky-950 underline decoration-sky-700/40 underline-offset-2 hover:decoration-sky-800"
          >
            {pendingVoidCount} void request
            {pendingVoidCount === 1 ? "" : "s"} awaiting your approval
          </Link>
          <span className="text-sky-800/90">
            {" "}
            — review reason and approve or decline on the Void approvals page.
          </span>
        </div>
      ) : null}

      {dbReady &&
      (session.role === "STAFF" || session.role === "TREASURER") &&
      latestVoidDecision &&
      latestVoidDecisionWithinWindow ? (
        <div
          className={`rounded-lg border p-4 text-sm ${
            latestVoidDecision.status === "APPROVED"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-rose-200 bg-rose-50 text-rose-900"
          }`}
        >
          <Link
            href="/void-request"
            className="font-semibold underline decoration-black/10 underline-offset-2 hover:decoration-black/20"
          >
            Void request {latestVoidDecision.status === "APPROVED" ? "approved" : "declined"}
          </Link>
          <div className="mt-1">
            {latestVoidDecision.status === "APPROVED" ? (
              <>
                {entityLabel(latestVoidDecision.entity)} reviewed by{" "}
                {latestVoidDecision.reviewedBy?.name ?? "admin"}{" "}
                {latestVoidDecision.reviewedAt
                  ? `on ${latestVoidDecision.reviewedAt.toLocaleDateString()}`
                  : ""}
                .
              </>
            ) : (
              <>
                {entityLabel(latestVoidDecision.entity)} declined
                {latestVoidDecision.declineNote?.trim()
                  ? `: ${latestVoidDecision.declineNote}`
                  : "."}
              </>
            )}
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-gradient-to-r from-[#1f6b87] to-[#253056] p-4 text-white">
          <div className="text-sm font-medium text-slate-100">
            Total Members
          </div>
          <div className="mt-2 text-3xl font-semibold">{totalMembers}</div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-gradient-to-r from-[#1f6b87] to-[#253056] p-4 text-white">
          <div className="text-sm font-medium text-slate-100">
            Attendance Today
          </div>
          <div className="mt-2 text-3xl font-semibold">
            {attendanceTodayPresent}
          </div>
        </div>

        {showDonations ? (
          <div className="rounded-xl border border-slate-200 bg-gradient-to-r from-[#1f6b87] to-[#253056] p-4 text-white">
            <div className="text-sm font-medium text-slate-100">
              Monthly Donations
            </div>
            <div className="mt-2 text-3xl font-semibold">
              {formatMoney(monthlyDonations)}
            </div>
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-sm font-semibold">Recent Donations</div>
          {!showDonations ? (
            <div className="mt-2 text-sm text-slate-500">
              Not available for your role.
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              {recentDonations.length === 0 ? (
                <div className="text-sm text-slate-500">No donations yet.</div>
              ) : (
                recentDonations.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium">
                        {d.memberName}
                      </div>
                      <div className="truncate text-xs text-slate-500">
                        {d.type} • {d.date.toLocaleDateString()}
                      </div>
                    </div>
                    <div className="font-semibold">
                      {formatMoney(Number(d.amount))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-sm font-semibold">Recent Attendance</div>
          <div className="mt-3 space-y-2">
            {recentAttendance.length === 0 ? (
              <div className="text-sm text-slate-500">No attendance yet.</div>
            ) : (
              recentAttendance.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">
                      {a.memberName}
                    </div>
                    <div className="truncate text-xs text-slate-500">
                      {a.eventTitle} • {a.date.toLocaleDateString()} •{" "}
                      {a.status === "PRESENT" ? "Present" : "Absent"}
                    </div>
                  </div>
                  <div
                    className={
                      a.status === "PRESENT"
                        ? "font-semibold text-green-700"
                        : "font-semibold text-red-700"
                    }
                  >
                    {a.status === "PRESENT" ? "Present" : "Absent"}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

