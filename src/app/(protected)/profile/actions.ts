"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { requireSession, signInAndCreateCookie, signOutAndClearCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/action-log";

const UpdateSelfProfileSchema = z.object({
  name: z.string().min(1).max(120),
  phoneNumber: z.string().trim().max(50).optional(),
  address: z.string().trim().max(191).optional(),
  birthdate: z.string().optional(),
});

export async function updateSelfProfileAction(
  userId: string,
  formData: FormData,
): Promise<void> {
  const session = await requireSession();
  if (session.userId !== userId) redirect("/login");

  const parsed = UpdateSelfProfileSchema.safeParse({
    name: (formData.get("name") ?? "") as string,
    phoneNumber: (formData.get("phoneNumber") ?? "") as string,
    address: (formData.get("address") ?? "") as string,
    birthdate: (formData.get("birthdate") ?? "") as string,
  });

  if (!parsed.success) {
    // Keep it simple for now: redirect back and let the user try again.
    redirect("/profile");
  }

  const { name, phoneNumber, address, birthdate } = parsed.data;
  const normalizedPhone = phoneNumber?.trim() ? phoneNumber.trim() : null;
  const normalizedAddress = address?.trim() ? address.trim() : null;
  const normalizedBirthdate =
    birthdate && birthdate.trim().length > 0 ? new Date(birthdate) : null;

  if (normalizedBirthdate && Number.isNaN(normalizedBirthdate.getTime())) {
    redirect("/profile");
  }

  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phoneNumber: true,
      address: true,
      birthdate: true,
    },
  });

  if (!existing) redirect("/login");

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      name,
      phoneNumber: normalizedPhone,
      address: normalizedAddress,
      birthdate: normalizedBirthdate,
    },
    select: { id: true, name: true, email: true, role: true },
  });

  await logAction({
    actionType: "UPDATE",
    module: "UserProfile",
    entityId: updated.id,
    oldValue: {
      name: existing.name,
      phoneNumber: existing.phoneNumber ?? null,
      address: existing.address ?? null,
      birthdate: existing.birthdate?.toISOString() ?? null,
    },
    newValue: {
      name: updated.name,
      phoneNumber: normalizedPhone,
      address: normalizedAddress,
      birthdate: normalizedBirthdate?.toISOString() ?? null,
    },
  });

  // Update cookie token so sidebar/profile name refreshes immediately.
  await signInAndCreateCookie({
    userId: updated.id,
    role: updated.role,
    name: updated.name,
    email: updated.email,
  });

  redirect("/profile");
}

export async function deleteSelfProfileAction(userId: string): Promise<void> {
  const session = await requireSession();
  if (session.userId !== userId) redirect("/login");

  const deleted = await prisma.user.delete({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true },
  });

  await logAction({
    actionType: "DELETE",
    module: "UserProfile",
    entityId: deleted.id,
    oldValue: { name: deleted.name, email: deleted.email, role: deleted.role },
    newValue: { deleted: true },
  });

  await signOutAndClearCookie();
  redirect("/login");
}

