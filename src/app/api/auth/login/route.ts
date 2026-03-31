import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signInAndCreateCookie } from "@/lib/auth";
import { logAction } from "@/lib/action-log";

const BodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "Invalid input." },
      { status: 400 },
    );
  }

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, role: true, passwordHash: true },
  });

  if (!user) {
    return NextResponse.json(
      { ok: false, message: "Email or password is incorrect." },
      { status: 401 },
    );
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return NextResponse.json(
      { ok: false, message: "Email or password is incorrect." },
      { status: 401 },
    );
  }

  await signInAndCreateCookie({
    userId: user.id,
    role: user.role,
    name: user.name,
    email: user.email,
  });

  await logAction({
    actionType: "LOGIN",
    module: "Auth",
    actor: {
      userId: user.id,
      name: user.name || user.email,
      role: user.role,
    },
    newValue: {
      email: user.email,
    },
  });

  return NextResponse.json({ ok: true });
}

