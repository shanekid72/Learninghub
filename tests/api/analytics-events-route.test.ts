import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  createAdminClient: vi.fn(),
  getSessionContext: vi.fn(),
  recordAnalyticsEvent: vi.fn(),
}))

vi.mock("@/lib/app-session", () => ({
  getSessionContext: mocks.getSessionContext,
}))

vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: mocks.createAdminClient,
}))

vi.mock("@/lib/server-analytics", () => ({
  recordAnalyticsEvent: mocks.recordAnalyticsEvent,
}))

import { POST } from "@/app/api/analytics/events/route"

describe("POST /api/analytics/events", () => {
  beforeEach(() => {
    mocks.getSessionContext.mockResolvedValue({
      email: "learner@example.com",
      profile: {
        id: "user-1",
        email: "learner@example.com",
        role: "learner",
        fullName: "Learner",
        team: "QA",
      },
    })
    mocks.createAdminClient.mockResolvedValue({ from: vi.fn() })
    mocks.recordAnalyticsEvent.mockResolvedValue(true)
  })

  it("rejects anonymous requests", async () => {
    mocks.getSessionContext.mockResolvedValue(null)

    const response = await POST(
      new Request("http://localhost/api/analytics/events", {
        method: "POST",
        body: JSON.stringify({ type: "module_view", moduleId: "module-1" }),
      }),
    )

    expect(response.status).toBe(401)
  })

  it("rejects invalid client event payloads", async () => {
    const response = await POST(
      new Request("http://localhost/api/analytics/events", {
        method: "POST",
        body: JSON.stringify({ type: "certificate_generated", moduleId: "module-1" }),
      }),
    )

    expect(response.status).toBe(400)
    expect(mocks.recordAnalyticsEvent).not.toHaveBeenCalled()
  })

  it("records allowed client-originated analytics through the server", async () => {
    const adminClient = { from: vi.fn() }
    mocks.createAdminClient.mockResolvedValue(adminClient)

    const response = await POST(
      new Request("http://localhost/api/analytics/events", {
        method: "POST",
        body: JSON.stringify({
          type: "quiz_start",
          moduleId: "module-1",
          quizId: "quiz-1",
        }),
      }),
    )

    expect(response.status).toBe(200)
    expect(mocks.recordAnalyticsEvent).toHaveBeenCalledWith(
      {
        userId: "user-1",
        type: "quiz_start",
        moduleId: "module-1",
        metadata: {
          quizId: "quiz-1",
        },
      },
      adminClient,
    )
  })
})
