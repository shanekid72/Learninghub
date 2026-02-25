import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const cookieName = process.env.AUTH_COOKIE_NAME || "lh_session";
  const value = req.cookies.get(cookieName)?.value;

  if (!value) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const email = decodeURIComponent(value).trim().toLowerCase();
  return NextResponse.json({ ok: true, email });
}
