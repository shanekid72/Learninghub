import { NextResponse } from "next/server";

export async function POST() {
  const cookieName = process.env.AUTH_COOKIE_NAME || "lh_session";
  const res = NextResponse.json({ ok: true });
  res.cookies.set(cookieName, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
