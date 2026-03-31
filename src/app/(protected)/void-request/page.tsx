import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Role, VoidRequestEntity, VoidRequestStatus } from "@/generated/prisma/enums";

function entityLabel(entity: VoidRequestEntity) {
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

function entityHref(entity: VoidRequestEntity) {
  switch (entity) {
    case "DONATION":
      return "/donations";
    case "SERVICE_INCOME":
      return "/tithes-offering";
    case "EXPENSE":
      return "/expenses";
    default:
      return "/";
  }
}

function entityChipClasses(entity: VoidRequestEntity) {
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

function statusPillClasses(status: VoidRequestStatus) {
  switch (status) {
    case "PENDING":
      return "border-amber-200 bg-amber-50 text-amber-900";
    case "APPROVED":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "DECLINED":
      return "border-rose-200 bg-rose-50 text-rose-800";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

function statusMessage(req: { status: VoidRequestStatus; reviewedBy?: { name: string } | null; reviewedAt?: Date | null; declineNote?: string | null }) {
  if (req.status === "PENDING") return "Awaiting admin approval.";
  if (req.status === "APPROVED") {
    const by = req.reviewedBy?.name ? ` by ${req.reviewedBy.name}` : "";
    const at = req.reviewedAt ? ` on ${req.reviewedAt.toLocaleDateString()}` : "";
    return `Approved${by}${at}.`;
  }
  const note = req.declineNote?.trim();
  return note && note.length > 0
    ? `Declined: ${note}`
    : "Declined by administrator (no note provided).";
}

export default async function VoidRequestPage() {
  const session = await requireRole(["STAFF", "TREASURER"] satisfies Role[]);
  const now = new Date();

  const requests = await prisma.voidRequest.findMany({
    where: { requestedById: session.userId },
    orderBy: { createdAt: "desc" },
    include: {
      reviewedBy: { select: { name: true } },
    },
  });

  const latestDecision = requests
    .filter((r) => r.status !== "PENDING")
    .sort(
      (a, b) =>
        (b.reviewedAt?.getTime() ?? 0) - (a.reviewedAt?.getTime() ?? 0),
    )[0];

  const withinWindow =
    latestDecision?.reviewedAt &&
    latestDecision.reviewedAt.getTime() >=
      new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).getTime();

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <header className="rounded-xl border border-slate-200 bg-white p-5">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Void request</h1>
        <p className="mt-1 text-sm text-slate-600">
          Track approval status for the void requests you submitted.
        </p>
      </header>

      {latestDecision && withinWindow ? (
        <section
          className={`rounded-lg border p-4 text-sm ${
            latestDecision.status === "APPROVED"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-rose-200 bg-rose-50 text-rose-900"
          }`}
        >
          <div className="font-semibold">
            {latestDecision.status === "APPROVED"
              ? "Your void request was approved."
              : "Your void request was declined."}
          </div>
          <div className="mt-1">
            {entityLabel(latestDecision.entity)}{" "}
            {latestDecision.status === "APPROVED" ? (
              <>
                reviewed by {latestDecision.reviewedBy?.name ?? "admin"}
                {latestDecision.reviewedAt
                  ? ` on ${latestDecision.reviewedAt.toLocaleDateString()}`
                  : ""}
                .
              </>
            ) : (
              <>
                {latestDecision.declineNote?.trim()
                  ? `Declined: ${latestDecision.declineNote}`
                  : "No decline note provided."}
              </>
            )}
          </div>
        </section>
      ) : null}

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        {requests.length === 0 ? (
          <div className="rounded-md border border-slate-200 bg-slate-50 p-5 text-center">
            <div className="text-sm font-medium text-slate-700">No void requests yet</div>
            <div className="mt-1 text-sm text-slate-600">When you submit a request, it will appear here.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left text-slate-700">
                  <th className="px-4 py-3 font-medium">Request</th>
                  <th className="px-4 py-3 font-medium">Reason</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {requests.map((req, idx) => (
                  <tr
                    key={req.id}
                    className={`align-top ${idx % 2 === 0 ? "bg-white" : "bg-amber-50/50"}`}
                  >
                    <td className="px-4 py-3" style={{ width: 270 }}>
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-1 text-xs font-semibold tabular-nums ${entityChipClasses(
                              req.entity,
                            )}`}
                          >
                            {entityLabel(req.entity)}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500">
                          Requested: {req.createdAt.toLocaleString()}
                        </div>
                        <div>
                          <Link
                            href={entityHref(req.entity)}
                            className="text-xs font-medium text-[#2f7d98] hover:underline"
                          >
                            View source record
                          </Link>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="whitespace-pre-wrap text-sm text-slate-700">{req.reason}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${statusPillClasses(
                          req.status,
                        )}`}
                      >
                        {req.status}
                      </span>
                      {req.reviewedAt ? (
                        <div className="mt-2 text-xs text-slate-500">
                          Reviewed: {req.reviewedAt.toLocaleString()}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <div className="whitespace-pre-wrap text-sm text-slate-700">
                        {statusMessage({
                          status: req.status,
                          reviewedBy: req.reviewedBy,
                          reviewedAt: req.reviewedAt,
                          declineNote: req.declineNote,
                        })}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

