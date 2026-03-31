import { NextResponse } from "next/server";
import { getServerSession, signOutAndClearCookie } from "@/lib/auth";
import { logAction } from "@/lib/action-log";

export async function POST() {
  const session = await getServerSession();
  await signOutAndClearCookie();

  if (session) {
    await logAction({
      actionType: "LOGOUT",
      module: "Auth",
      actor: {
        userId: session.userId,
        name: session.name || session.email,
        role: session.role,
      },
      newValue: { email: session.email },
    });
  }

  return NextResponse.json({ ok: true });
}

