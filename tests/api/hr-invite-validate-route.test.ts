import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  createAdminClient: vi.fn(),
  getHrInviteValidation: vi.fn(),
  isHrIntegrityEnabled: vi.fn(),
}))

vi.mock("@/lib/hr/feature", () => ({
  isHrIntegrityEnabled: mocks.isHrIntegrityEnabled,
}))

vi.mock("@/lib/hr/server", () => ({
  getHrInviteValidation: mocks.getHrInviteValidation,
}))

vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: mocks.createAdminClient,
}))

import { POST } from "@/app/api/hr/invite/validate/route"

describe("POST /api/hr/invite/validate", () => {
  beforeEach(() => {
    mocks.isHrIntegrityEnabled.mockReturnValue(true)
    mocks.createAdminClient.mockResolvedValue({})
  })

  it("returns 400 for invalid payloads", async () => {
    const response = await POST(
      new Request("http://localhost/api/hr/invite/validate", {
        method: "POST",
        body: JSON.stringify({ token: "short" }),
      }),
    )

    expect(response.status).toBe(400)
  })

  it("returns the minimized public validation payload", async () => {
    mocks.getHrInviteValidation.mockResolvedValue({
      inviteId: "invite-1",
      reason: "valid",
      valid: true,
      session: {
        candidateName: "Ada Lovelace",
        inviteExpiresAt: "2026-03-24T00:00:00.000Z",
        jobTitle: "Senior Engineer",
        scheduledAt: null,
        status: "invited",
      },
    })

    const response = await POST(
      new Request("http://localhost/api/hr/invite/validate", {
        method: "POST",
        body: JSON.stringify({ token: "x".repeat(32) }),
      }),
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      valid: true,
      session: {
        candidateName: "Ada Lovelace",
        jobTitle: "Senior Engineer",
      },
    })
  })
})
