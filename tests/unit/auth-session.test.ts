import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  createSignedSession,
  readEmailFromSession,
  verifySignedSession,
} from "@/lib/auth-session"

describe("auth-session", () => {
  beforeEach(() => {
    process.env.AUTH_COOKIE_SECRET = "test-secret-for-sessions"
    process.env.AUTH_SESSION_TTL_HOURS = "1"
  })

  afterEach(() => {
    vi.useRealTimers()
    delete process.env.AUTH_COOKIE_SECRET
    delete process.env.AUTH_SESSION_TTL_HOURS
  })

  it("creates and verifies a signed session token", async () => {
    const token = await createSignedSession("USER@Example.com")
    const payload = await verifySignedSession(token)

    expect(payload?.email).toBe("user@example.com")
    expect(payload?.exp).toBeGreaterThan(payload?.iat ?? 0)
  })

  it("rejects tampered session tokens", async () => {
    const token = await createSignedSession("user@example.com")
    const [payload, signature] = token.split(".")
    const tampered = `${payload}.tampered${signature}`

    await expect(verifySignedSession(tampered)).resolves.toBeNull()
  })

  it("rejects expired session tokens", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"))
    const token = await createSignedSession("user@example.com")

    vi.setSystemTime(new Date("2026-01-01T02:00:01.000Z"))
    await expect(verifySignedSession(token)).resolves.toBeNull()
  })

  it("returns null email for missing token", async () => {
    await expect(readEmailFromSession(undefined)).resolves.toBeNull()
    await expect(readEmailFromSession(null)).resolves.toBeNull()
  })
})
