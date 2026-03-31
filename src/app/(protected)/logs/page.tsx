import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/generated/prisma/enums";
import { DeleteSubmitButton } from "@/components/form-buttons";
import { deleteActionLogAction } from "./actions";

function formatDetails(details: unknown) {
  if (!details) return "—";
  try {
    return JSON.stringify(details, null, 2);
  } catch {
    return "—";
  }
}

export default async function LogsPage() {
  await requireRole(["ADMIN"] satisfies Role[]);

  let logs: Array<{
    id: string;
    actorName: string;
    actorRole: Role;
    action: string;
    entity: string;
    actionType: string | null;
    module: string | null;
    oldValue: unknown;
    newValue: unknown;
    entityId: string | null;
    details: unknown;
    timestamp: Date;
    createdAt: Date;
  }> = [];
  let dbReady = true;

  try {
    logs = await prisma.actionLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        actorName: true,
        actorRole: true,
        action: true,
        entity: true,
        actionType: true,
        module: true,
        oldValue: true,
        newValue: true,
        entityId: true,
        details: true,
        timestamp: true,
        createdAt: true,
      },
    });
  } catch {
    dbReady = false;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h1 className="text-2xl font-semibold">Action Logs</h1>
        <p className="mt-1 text-sm text-slate-600">Audit trail of user actions across the system.</p>
      </div>

      {!dbReady ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Logs table is not available yet. Run Prisma migration to create it.
        </div>
      ) : null}

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-slate-700">
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Actor</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Module</th>
                <th className="px-4 py-3 font-medium">Old Value</th>
                <th className="px-4 py-3 font-medium">New Value</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                    No logs yet.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="border-t border-slate-100 align-top">
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                      {(log.timestamp ?? log.createdAt).toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="font-medium">{log.actorName}</div>
                      <div className="text-xs text-slate-500">{log.actorRole}</div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-800">
                      {log.actionType ?? log.action}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {log.module ?? log.entity}
                      {log.entityId ? (
                        <div className="break-all text-xs text-slate-500">{log.entityId}</div>
                      ) : null}
                    </td>
                    <td className="max-w-xl px-4 py-3 text-xs text-slate-600">
                      <pre className="whitespace-pre-wrap break-all font-mono">
                        {formatDetails(log.oldValue)}
                      </pre>
                    </td>
                    <td className="max-w-xl px-4 py-3 text-xs text-slate-600">
                      <pre className="whitespace-pre-wrap break-all font-mono">
                        {formatDetails(log.newValue ?? log.details)}
                      </pre>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <form action={deleteActionLogAction.bind(null, log.id)}>
                        <DeleteSubmitButton />
                      </form>
                    </td>
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
