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
});

export async function createUserAction(formData: FormData) {
  await requireRole(["ADMIN"] satisfies Role[]);

  const parsed = CreateUserSchema.safeParse({
    name: (formData.get("name") ?? "") as string,
    email: (formData.get("email") ?? "") as string,
    password: (formData.get("password") ?? "") as string,
    role: (formData.get("role") ?? "") as string,
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const { name, email, password, role } = parsed.data;

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
    },
  });
  await logAction({
    action: "CREATE",
    entity: "User",
    entityId: user.id,
    details: { name: user.name, email: user.email, role: user.role },
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
