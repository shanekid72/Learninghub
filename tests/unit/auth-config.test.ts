import { NextResponse } from "next/server"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
  LEGACY_AUTH_COOKIE_NAME,
  buildRootRedirect,
  clearLegacyAuthCookie,
  getAllowedAuthDomains,
  getAuthCallbackUrl,
  isAllowedAuthEmail,
  normalizeEmail,
} from "@/lib/auth-config"

describe("auth-config", () => {
  beforeEach(() => {
    delete process.env.APP_BASE_URL
    delete process.env.NEXT_PUBLIC_APP_URL
    delete process.env.AUTH_ALLOWED_EMAIL_DOMAINS
  })

  afterEach(() => {
    delete process.env.APP_BASE_URL
    delete process.env.NEXT_PUBLIC_APP_URL
    delete process.env.AUTH_ALLOWED_EMAIL_DOMAINS
  })

  it("normalizes email addresses safely", () => {
    expect(normalizeEmail(" User@Example.com ")).toBe("user@example.com")
    expect(normalizeEmail("invalid-email")).toBeNull()
    expect(normalizeEmail(undefined)).toBeNull()
  })

  it("parses allowed auth domains and fails closed when the allowlist is empty", () => {
    expect(getAllowedAuthDomains()).toEqual([])
    expect(isAllowedAuthEmail("user@example.com")).toBe(false)

    process.env.AUTH_ALLOWED_EMAIL_DOMAINS = "example.com, internal.test "
    expect(getAllowedAuthDomains()).toEqual(["example.com", "internal.test"])
    expect(isAllowedAuthEmail("user@example.com")).toBe(true)
    expect(isAllowedAuthEmail("user@other.com")).toBe(false)
  })

  it("builds callback and root redirect URLs from the configured app base url", () => {
    process.env.APP_BASE_URL = "https://learninghub.example.com/"

    expect(getAuthCallbackUrl()).toBe("https://learninghub.example.com/auth/callback")

    const response = buildRootRedirect("http://localhost:3000", "auth_missing_code")
    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toBe(
      "https://learninghub.example.com/?error=auth_missing_code",
    )
  })

  it("clears the retired legacy auth cookie", () => {
    const response = NextResponse.json({ ok: true })
    clearLegacyAuthCookie(response)

    const cookie = response.cookies.get(LEGACY_AUTH_COOKIE_NAME)
    expect(cookie?.value).toBe("")
    expect(cookie?.maxAge).toBe(0)
  })
})
