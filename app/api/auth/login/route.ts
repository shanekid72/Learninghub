import { NextResponse } from "next/server";
import { getRateLimitResponse, checkRateLimit, getClientIP } from "@/lib/rate-limit";
import { isValidEmail } from "@/lib/sanitize";
import {
  createSignedSession,
  getAuthCookieName,
  getSessionTtlHours,
} from "@/lib/auth-session";

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
  const clientIP = getClientIP(req);
  const rateLimitResult = checkRateLimit(clientIP, "/api/auth/login");
  if (!rateLimitResult.success) {
    return getRateLimitResponse(rateLimitResult.resetIn);
  }

  let body: { email?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
  }

  const clean = String(body.email || "").trim().toLowerCase();

  if (!isValidEmail(clean)) {
    return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });
  }
  if (!allowedDomain(clean)) {
    return NextResponse.json({ ok: false, error: "domain_not_allowed" }, { status: 403 });
  }

  let sessionToken: string;
  try {
    sessionToken = await createSignedSession(clean);
  } catch {
    return NextResponse.json({ ok: false, error: "missing_auth_secret" }, { status: 500 });
  }

  const ttlSeconds = Math.floor(getSessionTtlHours() * 3600);
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
  const cookieName = getAuthCookieName();
  const res = NextResponse.json({ ok: true, email: clean, expiresAt });

  res.cookies.set(cookieName, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ttlSeconds,
  });

  return res;
}
