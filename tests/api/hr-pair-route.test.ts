import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  isHrIntegrityEnabled: vi.fn(),
  pairHrSession: vi.fn(),
  createAdminClient: vi.fn(),
}))

vi.mock("@/lib/hr/feature", () => ({
  isHrIntegrityEnabled: mocks.isHrIntegrityEnabled,
}))

vi.mock("@/lib/hr/server", () => ({
  pairHrSession: mocks.pairHrSession,
}))

vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: mocks.createAdminClient,
}))

import { POST } from "@/app/api/hr/pair/route"

describe("POST /api/hr/pair", () => {
  const scannerPublicKey = "A".repeat(120)

  beforeEach(() => {
    mocks.isHrIntegrityEnabled.mockReturnValue(true)
    mocks.createAdminClient.mockResolvedValue({})
  })

  it("returns 404 when feature flag is disabled", async () => {
    mocks.isHrIntegrityEnabled.mockReturnValue(false)

    const response = await POST(
      new Request("http://localhost/api/hr/pair", {
        method: "POST",
        body: JSON.stringify({
          token: "x".repeat(20),
          scannerPublicKey,
        }),
      }),
    )

    expect(response.status).toBe(404)
  })

  it("returns 400 for invalid pair requests", async () => {
    const response = await POST(
      new Request("http://localhost/api/hr/pair", {
        method: "POST",
        body: JSON.stringify({ token: "short" }),
      }),
    )

    expect(response.status).toBe(400)
  })

  it("returns pairing payload on success", async () => {
    mocks.pairHrSession.mockResolvedValue({
      session: { id: "session-1" },
      uploadToken: "upload-token",
      uploadTokenExpiresAt: "2026-03-24T00:00:00.000Z",
    })

    const response = await POST(
      new Request("http://localhost/api/hr/pair", {
        method: "POST",
        body: JSON.stringify({
          token: "x".repeat(20),
          scannerFingerprint: "fingerprint-1234567890",
          scannerPublicKey,
        }),
      }),
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      uploadToken: "upload-token",
    })
    expect(mocks.pairHrSession).toHaveBeenCalled()
  })
})
