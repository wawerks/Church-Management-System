"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { requireRole, getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/action-log";
import type { Role } from "@/generated/prisma/enums";

const CreateUserSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(200),
  role: z.enum(["ADMIN", "PASTOR", "STAFF", "TREASURER"]),
  phoneNumber: z.string().trim().max(50).optional(),
  address: z.string().trim().max(191).optional(),
  birthdate: z.string().optional(),
});

const UpdateUserSchema = z.object({
  name: z.string().min(1).max(120),
  role: z.enum(["ADMIN", "PASTOR", "STAFF", "TREASURER"]),
  phoneNumber: z.string().trim().max(50).optional(),
  address: z.string().trim().max(191).optional(),
  birthdate: z.string().optional(),
});

export type UpdateUserResult = { ok: false; message: string };

export async function createUserAction(formData: FormData) {
  await requireRole(["ADMIN"] satisfies Role[]);

  const parsed = CreateUserSchema.safeParse({
    name: (formData.get("name") ?? "") as string,
    email: (formData.get("email") ?? "") as string,
    password: (formData.get("password") ?? "") as string,
    role: (formData.get("role") ?? "") as string,
    phoneNumber: (formData.get("phoneNumber") ?? "") as string,
    address: (formData.get("address") ?? "") as string,
    birthdate: (formData.get("birthdate") ?? "") as string,
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const { name, email, password, role, phoneNumber, address, birthdate } = parsed.data;
  const normalizedPhone = phoneNumber?.trim() ? phoneNumber.trim() : undefined;
  const normalizedAddress = address?.trim() ? address.trim() : undefined;
  const normalizedBirthdate =
    birthdate && birthdate.trim().length > 0 ? new Date(birthdate) : undefined;
  if (normalizedBirthdate && Number.isNaN(normalizedBirthdate.getTime())) {
    throw new Error("Invalid birthdate.");
  }

  const exists = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (exists) {
    throw new Error("A user with this email already exists.");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role,
      phoneNumber: normalizedPhone,
      address: normalizedAddress,
      birthdate: normalizedBirthdate,
    },
  });
  await logAction({
    action: "CREATE",
    entity: "User",
    entityId: user.id,
    details: {
      name: user.name,
      email: user.email,
      role: user.role,
      phoneNumber: user.phoneNumber,
      address: user.address,
      birthdate: user.birthdate?.toISOString() ?? null,
    },
  });

  redirect("/users");
}

export async function updateUserAction(
  userId: string,
  formData: FormData,
): Promise<UpdateUserResult | void> {
  await requireRole(["ADMIN"] satisfies Role[]);

  const session = await getServerSession();
  if (!session) {
    return { ok: false, message: "You’re not signed in." };
  }

  const parsed = UpdateUserSchema.safeParse({
    name: (formData.get("name") ?? "") as string,
    role: (formData.get("role") ?? "") as string,
    phoneNumber: (formData.get("phoneNumber") ?? "") as string,
    address: (formData.get("address") ?? "") as string,
    birthdate: (formData.get("birthdate") ?? "") as string,
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  const { name, role, phoneNumber, address, birthdate } = parsed.data;
  const normalizedPhone = phoneNumber?.trim() ? phoneNumber.trim() : null;
  const normalizedAddress = address?.trim() ? address.trim() : null;
  const normalizedBirthdate =
    birthdate && birthdate.trim().length > 0 ? new Date(birthdate) : null;
  if (normalizedBirthdate && Number.isNaN(normalizedBirthdate.getTime())) {
    return { ok: false, message: "Invalid birthdate." };
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
  if (!existing) {
    return { ok: false, message: "User not found." };
  }

  if (session.userId === userId && role !== "ADMIN") {
    return {
      ok: false,
      message:
        "You can’t change your own role. Your account must stay Admin so you can manage users and settings.",
    };
  }

  if (existing.role === "ADMIN" && role !== "ADMIN") {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    if (adminCount <= 1) {
      return {
        ok: false,
        message:
          "You can’t demote the last administrator. Add another admin first.",
      };
    }
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      name,
      role,
      phoneNumber: normalizedPhone,
      address: normalizedAddress,
      birthdate: normalizedBirthdate,
    },
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

  await logAction({
    action: "UPDATE",
    entity: "User",
    entityId: updated.id,
    details: {
      email: updated.email,
      name: { from: existing.name, to: updated.name },
      role: { from: existing.role, to: updated.role },
      phoneNumber: { from: existing.phoneNumber, to: updated.phoneNumber },
      address: { from: existing.address, to: updated.address },
      birthdate: {
        from: existing.birthdate?.toISOString() ?? null,
        to: updated.birthdate?.toISOString() ?? null,
      },
    },
  });

  redirect("/users");
}

export async function deleteUserAction(userId: string) {
  await requireRole(["ADMIN"] satisfies Role[]);

  const session = await getServerSession();
  if (!session) throw new Error("Not signed in.");
  if (session.userId === userId) {
    throw new Error("You cannot delete your own account.");
  }

  const deleted = await prisma.user.delete({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true },
  });
  await logAction({
    action: "DELETE",
    entity: "User",
    entityId: deleted.id,
    details: { name: deleted.name, email: deleted.email, role: deleted.role },
  });
  redirect("/users");
}
