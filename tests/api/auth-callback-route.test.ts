import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}))

import { GET } from "@/app/auth/callback/route"

describe("auth callback route", () => {
  beforeEach(() => {
    process.env.AUTH_ALLOWED_EMAIL_DOMAINS = "example.com"
    delete process.env.APP_BASE_URL
    delete process.env.NEXT_PUBLIC_APP_URL
  })

  it("redirects to root when the provider returns an error", async () => {
    const response = await GET(
      new NextRequest("http://localhost/auth/callback?error=access_denied"),
    )

    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toBe("http://localhost/?error=oauth_access_denied")
    expect(response.headers.get("set-cookie")).toContain("lh_session=")
  })

  it("redirects to root when the callback code is missing", async () => {
    const response = await GET(new NextRequest("http://localhost/auth/callback"))

    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toBe("http://localhost/?error=auth_missing_code")
    expect(response.headers.get("set-cookie")).toContain("lh_session=")
  })

  it("signs the user back out when their Google email domain is not allowed", async () => {
    const signOut = vi.fn().mockResolvedValue({ error: null })
    mocks.createClient.mockResolvedValue({
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: "user-1",
              email: "learner@other.com",
            },
          },
          error: null,
        }),
        signOut,
      },
    })

    const response = await GET(
      new NextRequest("http://localhost/auth/callback?code=oauth-code"),
    )

    expect(signOut).toHaveBeenCalledOnce()
    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toBe("http://localhost/?error=auth_domain_not_allowed")
    expect(response.headers.get("set-cookie")).toContain("lh_session=")
  })

  it("redirects authenticated and allowed users into the hub", async () => {
    mocks.createClient.mockResolvedValue({
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: "user-1",
              email: "learner@example.com",
            },
          },
          error: null,
        }),
        signOut: vi.fn(),
      },
    })

    const response = await GET(
      new NextRequest("http://localhost/auth/callback?code=oauth-code"),
    )

    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toBe("http://localhost/hub")
    expect(response.headers.get("set-cookie")).toContain("lh_session=")
  })
})
