import { NextResponse } from "next/server";
import { getAuthCookieName } from "@/lib/auth-session";

export async function POST() {
  const cookieName = getAuthCookieName();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(cookieName, "", { httpOnly: true, path: "/", maxAge: 0, sameSite: "lax" });
  return res;
}
