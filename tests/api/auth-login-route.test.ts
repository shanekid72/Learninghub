import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  checkRateLimit: vi.fn(),
  createClient: vi.fn(),
  createRateLimitCookieValue: vi.fn(),
  getRateLimitResponse: vi.fn(),
}))

vi.mock("@/lib/rate-limit", () => ({
  attachRateLimitCookie: (response: Response, value: string) => {
    response.headers.append("set-cookie", `lh_rlid=${value}; Path=/; HttpOnly; SameSite=Lax`)
    return response
  },
  checkRateLimit: mocks.checkRateLimit,
  createRateLimitCookieValue: mocks.createRateLimitCookieValue,
  getRateLimitCookieName: () => "lh_rlid",
  getRateLimitResponse: mocks.getRateLimitResponse,
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}))

import { GET, POST } from "@/app/api/auth/login/route"

describe("auth login route", () => {
  beforeEach(() => {
    mocks.checkRateLimit.mockReturnValue({
      success: true,
      remaining: 4,
      resetIn: 60_000,
    })
    mocks.createRateLimitCookieValue.mockReturnValue("rate-limit-id")
    mocks.getRateLimitResponse.mockImplementation(
      (resetIn: number) =>
        new Response(
          JSON.stringify({
            error: "Too many requests",
            retryAfter: Math.ceil(resetIn / 1000),
          }),
          {
            status: 429,
            headers: { "Retry-After": String(Math.ceil(resetIn / 1000)) },
          },
        ),
    )
    mocks.createClient.mockResolvedValue({
      auth: {
        signInWithOAuth: vi.fn().mockResolvedValue({
          data: { url: "https://accounts.google.com/o/oauth2/v2/auth" },
          error: null,
        }),
      },
    })
    process.env.AUTH_ALLOWED_EMAIL_DOMAINS = "example.com"
    delete process.env.APP_BASE_URL
    delete process.env.NEXT_PUBLIC_APP_URL
  })

  it("returns 410 for the retired email POST login endpoint", async () => {
    const response = await POST()

    expect(response.status).toBe(410)
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "email_login_removed",
    })
  })

  it("returns 429 when the login initiation rate limit is exceeded", async () => {
    mocks.checkRateLimit.mockReturnValue({
      success: false,
      remaining: 0,
      resetIn: 3_000,
    })

    const response = await GET(new NextRequest("http://localhost/api/auth/login"))

    expect(response.status).toBe(429)
    expect(mocks.getRateLimitResponse).toHaveBeenCalledWith(3_000)
    expect(response.headers.get("set-cookie")).toContain("lh_rlid=rate-limit-id")
  })

  it("fails closed when allowed auth domains are not configured", async () => {
    process.env.AUTH_ALLOWED_EMAIL_DOMAINS = ""

    const response = await GET(new NextRequest("http://localhost/api/auth/login"))

    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toBe("http://localhost/?error=auth_domain_not_configured")
    expect(response.headers.get("set-cookie")).toContain("lh_rlid=rate-limit-id")
  })

  it("starts Google OAuth using the existing server-issued rate-limit cookie", async () => {
    const signInWithOAuth = vi.fn().mockResolvedValue({
      data: { url: "https://accounts.google.com/o/oauth2/v2/auth?client_id=test" },
      error: null,
    })
    mocks.createClient.mockResolvedValue({
      auth: {
        signInWithOAuth,
      },
    })

    const response = await GET(
      new NextRequest("http://localhost/api/auth/login", {
        headers: {
          cookie: "lh_rlid=existing-rlid",
        },
      }),
    )

    expect(mocks.checkRateLimit).toHaveBeenCalledWith("existing-rlid", "/api/auth/login")
    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo: "http://localhost/auth/callback",
        queryParams: {
          hd: "example.com",
          prompt: "select_account",
        },
      },
    })
    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toBe(
      "https://accounts.google.com/o/oauth2/v2/auth?client_id=test",
    )
    expect(response.headers.get("set-cookie")).toBeNull()
  })
})
