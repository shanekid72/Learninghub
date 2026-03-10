import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  checkRateLimit,
  getClientIP,
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

    for (let i = 0; i < 5; i += 1) {
      const result = checkRateLimit(id, path)
      expect(result.success).toBe(true)
      expect(result.remaining).toBe(4 - i)
    }

    const blocked = checkRateLimit(id, path)
    expect(blocked.success).toBe(false)
    expect(blocked.remaining).toBe(0)
    expect(blocked.resetIn).toBeGreaterThan(0)
  })

  it("resets a route window when window duration has passed", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"))

    const id = "window-reset-user"
    const path = "/api/auth/login"
    const first = checkRateLimit(id, path)
    expect(first.success).toBe(true)
    expect(first.remaining).toBe(4)

    vi.advanceTimersByTime(61_000)
    const second = checkRateLimit(id, path)
    expect(second.success).toBe(true)
    expect(second.remaining).toBe(4)
  })

  it("builds standard 429 response payload", async () => {
    const response = getRateLimitResponse(2_200)
    expect(response.status).toBe(429)
    expect(response.headers.get("Retry-After")).toBe("3")

    const body = (await response.json()) as { error: string; retryAfter: number }
    expect(body.error).toBe("Too many requests")
    expect(body.retryAfter).toBe(3)
  })

  it("reads client IP from forwarding headers", () => {
    const req = new Request("https://example.com", {
      headers: {
        "x-forwarded-for": "1.1.1.1, 10.0.0.1",
      },
    })
    expect(getClientIP(req)).toBe("1.1.1.1")

    const fallbackReq = new Request("https://example.com", {
      headers: {
        "x-real-ip": "2.2.2.2",
      },
    })
    expect(getClientIP(fallbackReq)).toBe("2.2.2.2")
  })
})
