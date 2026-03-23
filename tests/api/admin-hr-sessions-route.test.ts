import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  createAdminClient: vi.fn(),
  getHrSessionDetail: vi.fn(),
  isHrIntegrityEnabled: vi.fn(),
  issueHrInvite: vi.fn(),
  requireAdminProfile: vi.fn(),
}))

vi.mock("@/lib/admin-auth", () => ({
  requireAdminProfile: mocks.requireAdminProfile,
}))

vi.mock("@/lib/hr/feature", () => ({
  isHrIntegrityEnabled: mocks.isHrIntegrityEnabled,
}))

vi.mock("@/lib/hr/server", () => ({
  getHrSessionDetail: mocks.getHrSessionDetail,
  issueHrInvite: mocks.issueHrInvite,
  listHrSessions: vi.fn(),
}))

vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: mocks.createAdminClient,
}))

import { POST } from "@/app/api/admin/hr/sessions/route"

describe("POST /api/admin/hr/sessions", () => {
  beforeEach(() => {
    mocks.isHrIntegrityEnabled.mockReturnValue(true)
    mocks.requireAdminProfile.mockResolvedValue({
      profile: { id: "admin-1", email: "admin@example.com", role: "admin" },
    })
    mocks.issueHrInvite.mockResolvedValue({
      inviteUrl: "http://localhost/hr/interview/token",
      emailSent: true,
      emailError: null,
    })
    mocks.getHrSessionDetail.mockResolvedValue({
      id: "session-1",
      candidateName: "Ada Lovelace",
    })
  })

  it("creates a session and returns invite metadata", async () => {
    const single = vi.fn().mockResolvedValue({
      data: { id: "session-1" },
      error: null,
    })
    const select = vi.fn().mockReturnValue({ single })
    const insert = vi.fn().mockReturnValue({ select })
    const from = vi.fn().mockReturnValue({ insert })

    mocks.createAdminClient.mockResolvedValue({ from })

    const response = await POST(
      new Request("http://localhost/api/admin/hr/sessions", {
        method: "POST",
        body: JSON.stringify({
          candidateName: "Ada Lovelace",
          candidateEmail: "ada@example.com",
          jobTitle: "Senior Engineer",
          sendEmail: true,
        }),
      }),
    )

    expect(response.status).toBe(201)
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        candidate_name: "Ada Lovelace",
        candidate_email: "ada@example.com",
        job_title: "Senior Engineer",
        created_by: "admin-1",
      }),
    )

    await expect(response.json()).resolves.toMatchObject({
      inviteUrl: "http://localhost/hr/interview/token",
      emailSent: true,
    })
  })
})
