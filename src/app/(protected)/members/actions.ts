"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/action-log";
import type { Role } from "@/generated/prisma/enums";

const MemberSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional().or(z.literal("")),
  birthdate: z.string().optional().or(z.literal("")),
  contactNumber: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  familyGroupId: z.string().optional().or(z.literal("")),
  familyGroupName: z.string().optional().or(z.literal("")),
});

function emptyToUndefined(v: string | undefined) {
  if (!v) return undefined;
  const s = v.trim();
  return s.length === 0 ? undefined : s;
}

function normalizeName(v: string) {
  return v.trim().replace(/\s+/g, " ");
}

export type CreateMemberModalState = {
  ok: boolean | null;
  message: string | null;
};

async function createMemberCore(formData: FormData) {
  await requireRole(["ADMIN", "STAFF"] satisfies Role[]);

  const parsed = MemberSchema.safeParse({
    firstName: (formData.get("firstName") ?? "") as string,
    lastName: (formData.get("lastName") ?? "") as string,
    gender: (formData.get("gender") ?? "") as string,
    birthdate: (formData.get("birthdate") ?? "") as string,
    contactNumber: (formData.get("contactNumber") ?? "") as string,
    address: (formData.get("address") ?? "") as string,
    familyGroupId: (formData.get("familyGroupId") ?? "") as string,
    familyGroupName: (formData.get("familyGroupName") ?? "") as string,
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const data = parsed.data;
  const firstName = normalizeName(data.firstName);
  const lastName = normalizeName(data.lastName);
  if (!firstName || !lastName) {
    throw new Error("First name and last name are required.");
  }

  const existingMember = await prisma.member.findFirst({
    where: { firstName, lastName },
    select: { id: true },
  });
  if (existingMember) {
    throw new Error("Member already exists.");
  }

  let familyGroupId: string | undefined = emptyToUndefined(data.familyGroupId);
  const familyGroupName = emptyToUndefined(data.familyGroupName);

  if (!familyGroupId && familyGroupName) {
    const existing = await prisma.familyGroup.findFirst({
      where: { familyName: familyGroupName },
    });
    if (existing) {
      familyGroupId = existing.id;
    } else {
      const created = await prisma.familyGroup.create({
        data: { familyName: familyGroupName },
      });
      familyGroupId = created.id;
    }
  }

  const birthdateStr = emptyToUndefined(data.birthdate);
  const birthdate = birthdateStr ? new Date(birthdateStr) : undefined;

  const member = await prisma.member.create({
    data: {
      firstName,
      lastName,
      gender: data.gender ? data.gender : undefined,
      birthdate,
      contactNumber: emptyToUndefined(data.contactNumber),
      address: emptyToUndefined(data.address),
      familyGroupId,
    },
  });
  await logAction({
    action: "CREATE",
    entity: "Member",
    entityId: member.id,
    details: { firstName: member.firstName, lastName: member.lastName },
  });

  return member;
}

export async function createMemberAction(formData: FormData) {
  await createMemberCore(formData);
  redirect("/members");
}

export async function createMemberModalAction(
  _prevState: CreateMemberModalState,
  formData: FormData,
): Promise<CreateMemberModalState> {
  try {
    await createMemberCore(formData);
    return { ok: true, message: "Member added." };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Unable to save member.",
    };
  }
}

export async function updateMemberAction(
  memberId: string,
  formData: FormData,
) {
  await requireRole(["ADMIN", "STAFF"] satisfies Role[]);

  const parsed = MemberSchema.safeParse({
    firstName: (formData.get("firstName") ?? "") as string,
    lastName: (formData.get("lastName") ?? "") as string,
    gender: (formData.get("gender") ?? "") as string,
    birthdate: (formData.get("birthdate") ?? "") as string,
    contactNumber: (formData.get("contactNumber") ?? "") as string,
    address: (formData.get("address") ?? "") as string,
    familyGroupId: (formData.get("familyGroupId") ?? "") as string,
    familyGroupName: (formData.get("familyGroupName") ?? "") as string,
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const data = parsed.data;

  let familyGroupId: string | undefined = emptyToUndefined(data.familyGroupId);
  const familyGroupName = emptyToUndefined(data.familyGroupName);

  if (!familyGroupId && familyGroupName) {
    const existing = await prisma.familyGroup.findFirst({
      where: { familyName: familyGroupName },
    });
    if (existing) {
      familyGroupId = existing.id;
    } else {
      const created = await prisma.familyGroup.create({
        data: { familyName: familyGroupName },
      });
      familyGroupId = created.id;
    }
  }

  const birthdateStr = emptyToUndefined(data.birthdate);
  const birthdate = birthdateStr ? new Date(birthdateStr) : undefined;

  const member = await prisma.member.update({
    where: { id: memberId },
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      gender: data.gender ? data.gender : undefined,
      birthdate,
      contactNumber: emptyToUndefined(data.contactNumber),
      address: emptyToUndefined(data.address),
      familyGroupId,
    },
  });
  await logAction({
    action: "UPDATE",
    entity: "Member",
    entityId: member.id,
    details: { firstName: member.firstName, lastName: member.lastName },
  });

  redirect("/members");
}

export async function deleteMemberAction(memberId: string) {
  await requireRole(["ADMIN", "STAFF"] satisfies Role[]);
  const deleted = await prisma.$transaction(async (tx) => {
    const existing = await tx.member.findUnique({
      where: { id: memberId },
      select: { id: true, firstName: true, lastName: true },
    });
    if (!existing) {
      throw new Error("Member not found.");
    }

    // Remove dependent rows first to satisfy FK constraints.
    await tx.attendance.deleteMany({ where: { memberId } });
    await tx.donation.deleteMany({ where: { memberId } });

    return tx.member.delete({
      where: { id: memberId },
      select: { id: true, firstName: true, lastName: true },
    });
  });
  await logAction({
    action: "DELETE",
    entity: "Member",
    entityId: deleted.id,
    details: { firstName: deleted.firstName, lastName: deleted.lastName },
  });
  redirect("/members");
}

