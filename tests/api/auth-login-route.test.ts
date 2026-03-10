import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getRateLimitResponse: vi.fn(),
  checkRateLimit: vi.fn(),
  getClientIP: vi.fn(),
  isValidEmail: vi.fn(),
  createSignedSession: vi.fn(),
  getAuthCookieName: vi.fn(),
  getSessionTtlHours: vi.fn(),
}))

vi.mock("@/lib/rate-limit", () => ({
  getRateLimitResponse: mocks.getRateLimitResponse,
  checkRateLimit: mocks.checkRateLimit,
  getClientIP: mocks.getClientIP,
}))

vi.mock("@/lib/sanitize", () => ({
  isValidEmail: mocks.isValidEmail,
}))

vi.mock("@/lib/auth-session", () => ({
  createSignedSession: mocks.createSignedSession,
  getAuthCookieName: mocks.getAuthCookieName,
  getSessionTtlHours: mocks.getSessionTtlHours,
}))

import { POST } from "@/app/api/auth/login/route"

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    mocks.getClientIP.mockReturnValue("127.0.0.1")
    mocks.checkRateLimit.mockReturnValue({
      success: true,
      remaining: 4,
      resetIn: 60_000,
    })
    mocks.isValidEmail.mockReturnValue(true)
    mocks.createSignedSession.mockResolvedValue("signed-token")
    mocks.getAuthCookieName.mockReturnValue("lh_session")
    mocks.getSessionTtlHours.mockReturnValue(24)
    mocks.getRateLimitResponse.mockImplementation(
      () => new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 }),
    )
    delete process.env.AUTH_ALLOWED_EMAIL_DOMAINS
  })

  it("returns 429 when rate limit fails", async () => {
    mocks.checkRateLimit.mockReturnValue({
      success: false,
      remaining: 0,
      resetIn: 3_000,
    })

    const res = await POST(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: "user@example.com" }),
      }),
    )
    expect(res.status).toBe(429)
    expect(mocks.getRateLimitResponse).toHaveBeenCalledWith(3_000)
  })

  it("returns 400 for malformed JSON payload", async () => {
    const res = await POST(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        body: "{bad-json}",
        headers: { "content-type": "application/json" },
      }),
    )

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({ ok: false, error: "invalid_payload" })
  })

  it("returns 400 for invalid email", async () => {
    mocks.isValidEmail.mockReturnValue(false)

    const res = await POST(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: "bad-email" }),
      }),
    )

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({ ok: false, error: "invalid_email" })
  })

  it("returns 403 for disallowed domain", async () => {
    process.env.AUTH_ALLOWED_EMAIL_DOMAINS = "allowed.com"

    const res = await POST(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: "user@other.com" }),
      }),
    )

    expect(res.status).toBe(403)
    await expect(res.json()).resolves.toMatchObject({ ok: false, error: "domain_not_allowed" })
  })

  it("sets signed auth cookie and returns expiry metadata on success", async () => {
    process.env.AUTH_ALLOWED_EMAIL_DOMAINS = "example.com"

    const res = await POST(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: "User@Example.com " }),
      }),
    )

    expect(res.status).toBe(200)
    expect(mocks.createSignedSession).toHaveBeenCalledWith("user@example.com")

    const body = (await res.json()) as { ok: boolean; email: string; expiresAt: string }
    expect(body.ok).toBe(true)
    expect(body.email).toBe("user@example.com")
    expect(body.expiresAt).toBeTypeOf("string")

    const setCookie = res.headers.get("set-cookie")
    expect(setCookie).toContain("lh_session=signed-token")
  })
})
