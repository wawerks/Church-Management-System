import { NextResponse } from "next/server";
import { signOutAndClearCookie } from "@/lib/auth";

export async function POST() {
  await signOutAndClearCookie();
  return NextResponse.json({ ok: true });
}

