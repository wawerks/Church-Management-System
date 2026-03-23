"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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

export async function createMemberAction(formData: FormData) {
  await requireRole(["ADMIN", "PASTOR", "STAFF"] satisfies Role[]);

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

  await prisma.member.create({
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

  // Go back to list
  redirect("/members");
}

export async function updateMemberAction(
  memberId: string,
  formData: FormData,
) {
  await requireRole(["ADMIN", "PASTOR", "STAFF"] satisfies Role[]);

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

  await prisma.member.update({
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

  redirect("/members");
}

export async function deleteMemberAction(memberId: string) {
  await requireRole(["ADMIN", "PASTOR", "STAFF"] satisfies Role[]);
  await prisma.member.delete({ where: { id: memberId } });
  redirect("/members");
}

