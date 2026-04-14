import { NextResponse } from "next/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  attachRateLimitCookie,
  checkRateLimit,
  createRateLimitCookieValue,
  getRateLimitCookieName,
  getRateLimitResponse,
  resetRateLimitForTests,
} from "@/lib/rate-limit"

describe("rate-limit", () => {
  beforeEach(() => {
    resetRateLimitForTests()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("allows requests until route limit and blocks the next request", () => {
    const id = `tester-${Date.now()}`
    const path = "/api/auth/login"

    for (let index = 0; index < 5; index += 1) {
      const result = checkRateLimit(id, path)
      expect(result.success).toBe(true)
      expect(result.remaining).toBe(4 - index)
    }

    const blocked = checkRateLimit(id, path)
    expect(blocked.success).toBe(false)
    expect(blocked.remaining).toBe(0)
    expect(blocked.resetIn).toBeGreaterThan(0)
  })

  it("resets a route window when the window duration has passed", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"))

    const first = checkRateLimit("window-reset-user", "/api/auth/login")
    expect(first.success).toBe(true)
    expect(first.remaining).toBe(4)

    vi.advanceTimersByTime(61_000)
    const second = checkRateLimit("window-reset-user", "/api/auth/login")
    expect(second.success).toBe(true)
    expect(second.remaining).toBe(4)
  })

  it("builds the standard 429 response payload", async () => {
    const response = getRateLimitResponse(2_200)
    expect(response.status).toBe(429)
    expect(response.headers.get("Retry-After")).toBe("3")

    const body = (await response.json()) as { error: string; retryAfter: number }
    expect(body.error).toBe("Too many requests")
    expect(body.retryAfter).toBe(3)
  })

  it("creates opaque server-issued rate-limit cookie ids", () => {
    expect(createRateLimitCookieValue()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    )
  })

  it("attaches the server-issued rate-limit cookie to responses", () => {
    const response = NextResponse.json({ ok: true })
    attachRateLimitCookie(response, "rate-limit-id")

    const cookie = response.cookies.get(getRateLimitCookieName())
    expect(cookie?.value).toBe("rate-limit-id")
    expect(cookie?.httpOnly).toBe(true)
    expect(cookie?.sameSite).toBe("lax")
  })
})
