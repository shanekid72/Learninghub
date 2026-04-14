import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  createAdminClient: vi.fn(),
  getSessionContext: vi.fn(),
}))

vi.mock("@/lib/app-session", () => ({
  getSessionContext: mocks.getSessionContext,
}))

vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: mocks.createAdminClient,
}))

import { GET } from "@/app/api/lh/completions/route"

describe("GET /api/lh/completions", () => {
  beforeEach(() => {
    mocks.getSessionContext.mockResolvedValue({
      email: "learner@example.com",
      profile: {
        id: "user-1",
        email: "learner@example.com",
        role: "learner",
        fullName: "Learner Example",
        team: "QA",
      },
    })
  })

  it("rejects anonymous access", async () => {
    mocks.getSessionContext.mockResolvedValue(null)

    const response = await GET()

    expect(response.status).toBe(401)
  })

  it("queries completion history by the authenticated learner id and keeps the latest record per module", async () => {
    const query = {
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnValue({
        data: [
          {
            module_id: "module-1",
            created_at: "2026-04-13T12:00:00.000Z",
            metadata: { source: "portal" },
          },
          {
            module_id: "module-1",
            created_at: "2026-04-10T09:00:00.000Z",
            metadata: { source: "legacy" },
          },
          {
            module_id: "module-2",
            created_at: "2026-04-11T10:00:00.000Z",
            metadata: null,
          },
        ],
        error: null,
      }),
    }
    mocks.createAdminClient.mockResolvedValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue(query),
      }),
    })

    const response = await GET()
    const body = (await response.json()) as {
      ok: boolean
      completions: Array<{ module_id: string; source: string }>
    }

    expect(query.eq).toHaveBeenNthCalledWith(1, "event_type", "module_complete")
    expect(query.eq).toHaveBeenNthCalledWith(2, "user_id", "user-1")
    expect(body.ok).toBe(true)
    expect(body.completions).toEqual([
      {
        email: "learner@example.com",
        module_id: "module-1",
        completed_at: "2026-04-13T12:00:00.000Z",
        source: "portal",
      },
      {
        email: "learner@example.com",
        module_id: "module-2",
        completed_at: "2026-04-11T10:00:00.000Z",
        source: "portal",
      },
    ])
  })
})
