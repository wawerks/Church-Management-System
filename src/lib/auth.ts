import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Role } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

export type Session = {
  userId: string;
  role: Role;
  name: string;
  email: string;
};

const COOKIE_NAME = "church_session";

function authSecret() {
  const secret = process.env.AUTH_SESSION_SECRET;
  if (!secret) throw new Error("Missing AUTH_SESSION_SECRET in environment.");
  return secret;
}

export function createSessionToken(session: Session) {
  return jwt.sign(
    {
      sub: session.userId,
      role: session.role,
      name: session.name,
      email: session.email,
    },
    authSecret(),
    {
      algorithm: "HS256",
      expiresIn: "7d",
    },
  );
}

export function verifySessionToken(token: string): Session | null {
  try {
    const decoded = jwt.verify(token, authSecret()) as jwt.JwtPayload & {
      sub?: string;
      role?: Role;
      name?: string;
      email?: string;
    };
    if (!decoded.sub || !decoded.role) return null;
    return {
      userId: decoded.sub,
      role: decoded.role,
      name: decoded.name ?? "",
      email: decoded.email ?? "",
    };
  } catch {
    return null;
  }
}

export async function getServerSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const session = verifySessionToken(token);
  if (!session) return null;

  // Optional sanity-check: confirm the user still exists.
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true },
  });
  if (!user) return null;

  return session;
}

export async function requireSession(): Promise<Session> {
  const session = await getServerSession();
  if (!session) redirect("/login");
  return session;
}

export async function requireRole(allowed: Role[]): Promise<Session> {
  const session = await requireSession();
  if (!allowed.includes(session.role)) redirect("/dashboard");
  return session;
}

export async function signInAndCreateCookie(params: {
  userId: string;
  role: Role;
  name: string;
  email: string;
}) {
  const token = createSessionToken({
    userId: params.userId,
    role: params.role,
    name: params.name,
    email: params.email,
  });

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function signOutAndClearCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

