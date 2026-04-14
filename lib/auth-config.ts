import { NextResponse } from "next/server"

export const LEGACY_AUTH_COOKIE_NAME = "lh_session"

export function normalizeEmail(value: string | null | undefined): string | null {
  if (!value) return null
  const clean = value.trim().toLowerCase()
  return clean && clean.includes("@") ? clean : null
}

export function getAllowedAuthDomains(): string[] {
  return (process.env.AUTH_ALLOWED_EMAIL_DOMAINS || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
}

export function isAllowedAuthEmail(email: string | null | undefined): boolean {
  const normalizedEmail = normalizeEmail(email)
  if (!normalizedEmail) return false

  const allowedDomains = getAllowedAuthDomains()
  if (allowedDomains.length === 0) return false

  const domain = normalizedEmail.split("@")[1] || ""
  return allowedDomains.includes(domain)
}

export function getAppBaseUrl(origin?: string): string {
  const baseUrl =
    process.env.APP_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    origin ||
    "http://localhost:3000"

  return baseUrl.replace(/\/+$/, "")
}

export function getAuthCallbackUrl(origin?: string): string {
  return `${getAppBaseUrl(origin)}/auth/callback`
}

export function buildRootRedirect(origin: string, errorCode: string) {
  const url = new URL("/", getAppBaseUrl(origin))
  url.searchParams.set("error", errorCode)
  return NextResponse.redirect(url)
}

export function clearLegacyAuthCookie(response: NextResponse) {
  response.cookies.set(LEGACY_AUTH_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  })
}
