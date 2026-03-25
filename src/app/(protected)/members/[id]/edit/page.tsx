import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { canMutateMembers } from "@/lib/permissions";
import { updateMemberAction } from "../../actions";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";

function toDateInputValue(d: Date | null | undefined) {
  if (!d) return "";
  // yyyy-mm-dd
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default async function EditMemberPage(props: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  if (!canMutateMembers(session.role)) redirect("/members");

  const { id } = await props.params;

  let member:
    | (Awaited<ReturnType<typeof prisma.member.findUnique>> & {
        familyGroup?: { id: string; familyName: string } | null;
      })
    | null = null;
  let familyGroups: Array<{ id: string; familyName: string }> = [];

  try {
    member = await prisma.member.findUnique({
      where: { id },
      include: { familyGroup: true },
    });
    familyGroups = await prisma.familyGroup.findMany({
      orderBy: { familyName: "asc" },
      select: { id: true, familyName: true },
    });
  } catch {
    member = null;
  }

  if (!member) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Member not found or database isn’t ready yet.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Edit Member</h1>
            <p className="mt-1 text-sm text-slate-600">
              Update member details and family group.
            </p>
          </div>
          <Link
            href="/members"
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Back
          </Link>
        </div>

        <form
          action={updateMemberAction.bind(null, member.id)}
          className="space-y-5"
        >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <div className="mb-1 text-sm font-medium text-slate-700">
              First name
            </div>
            <input
              name="firstName"
              required
              defaultValue={member.firstName}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            />
          </label>

          <label className="block">
            <div className="mb-1 text-sm font-medium text-slate-700">
              Last name
            </div>
            <input
              name="lastName"
              required
              defaultValue={member.lastName}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <label className="block">
            <div className="mb-1 text-sm font-medium text-slate-700">
              Gender
            </div>
            <select
              name="gender"
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
              defaultValue={member.gender ?? ""}
            >
              <option value="">—</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </select>
          </label>

          <label className="block">
            <div className="mb-1 text-sm font-medium text-slate-700">
              Birthdate
            </div>
            <input
              name="birthdate"
              type="date"
              defaultValue={toDateInputValue(member.birthdate)}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            />
          </label>

          <label className="block">
            <div className="mb-1 text-sm font-medium text-slate-700">
              Contact number
            </div>
            <input
              name="contactNumber"
              defaultValue={member.contactNumber ?? ""}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            />
          </label>
        </div>

        <label className="block">
          <div className="mb-1 text-sm font-medium text-slate-700">Address</div>
          <AddressAutocomplete
            name="address"
            defaultValue={member.address ?? ""}
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
          />
        </label>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-sm font-semibold text-slate-800">
            Family Group
          </div>
          <div className="mt-1 text-xs text-slate-600">
            Select a group, or enter a new group name (optional).
          </div>

          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <label className="block">
              <div className="mb-1 text-sm font-medium text-slate-700">
                Select group
              </div>
              <select
                name="familyGroupId"
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                defaultValue={member.familyGroupId ?? ""}
              >
                <option value="">— No group —</option>
                {familyGroups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.familyName}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <div className="mb-1 text-sm font-medium text-slate-700">
                New group name (optional)
              </div>
              <input
                name="familyGroupName"
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                placeholder="Leave empty to keep current"
              />
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Link
            href="/members"
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </Link>
          <ConfirmSubmitButton
            pendingLabel="Saving…"
            confirmMessage="Save changes to this member?"
            className="rounded-md bg-black px-3 py-2 text-sm font-medium text-white hover:bg-black/90"
          >
            Save Changes
          </ConfirmSubmitButton>
        </div>
        </form>
      </div>
    </div>
  );
}

