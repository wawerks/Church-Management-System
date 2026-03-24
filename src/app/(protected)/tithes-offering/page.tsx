import Link from "next/link";
import { requireRole, requireSession } from "@/lib/auth";
import { canMutateDonations } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/generated/prisma/enums";
import { deleteServiceIncomeAction } from "./actions";
import { SubmitButton } from "@/components/form-buttons";

export default async function TithesOfferingPage() {
  await requireRole(["ADMIN", "PASTOR", "STAFF", "TREASURER"] satisfies Role[]);
  const session = await requireSession();
  const canEdit = canMutateDonations(session.role);

  let dbReady = true;
  let rows: Array<{ id: string; serviceDate: Date; amount: string }> = [];
  let total = 0;

  try {
    const [list, agg] = await Promise.all([
      prisma.serviceIncome.findMany({
        orderBy: { serviceDate: "desc" },
        take: 50,
      }),
      prisma.serviceIncome.aggregate({
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

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Tithes & Offering</h1>
          <p className="mt-1 text-sm text-slate-600">
            Total income per Sunday service, separate from donations.
          </p>
        </div>
        {canEdit ? (
          <Link
            href="/tithes-offering/new"
            className="rounded-md bg-black px-3 py-2 text-sm font-medium text-white hover:bg-black/90"
          >
            + Add Service Income
          </Link>
        ) : null}
      </div>

      {!dbReady ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Database isn&apos;t ready yet. Run Prisma migration first.
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-1">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-sm font-medium text-slate-600">
            Total Tithes & Offering
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
                        <form action={deleteServiceIncomeAction.bind(null, r.id)}>
                          <SubmitButton
                            pendingLabel="Deleting..."
                            className="rounded-md bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700"
                          >
                            Delete
                          </SubmitButton>
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
