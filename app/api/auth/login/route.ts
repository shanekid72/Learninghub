import { NextResponse } from "next/server";

function allowedDomain(email: string) {
  const allowed = (process.env.AUTH_ALLOWED_EMAIL_DOMAINS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  if (allowed.length === 0) return true;
  const domain = email.split("@")[1]?.toLowerCase() || "";
  return allowed.includes(domain);
}

export async function POST(req: Request) {
  let body: { email?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
  }

  const clean = String(body.email || "").trim().toLowerCase();

  if (!clean.includes("@")) {
    return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });
  }
  if (!allowedDomain(clean)) {
    return NextResponse.json({ ok: false, error: "domain_not_allowed" }, { status: 403 });
  }

  const cookieName = process.env.AUTH_COOKIE_NAME || "lh_session";
  const res = NextResponse.json({ ok: true });

  res.cookies.set(cookieName, clean, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  return res;
}
