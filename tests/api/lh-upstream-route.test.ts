import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  createAdminClient: vi.fn(),
}))

vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: mocks.createAdminClient,
}))

import { GET, POST } from "@/app/api/lh/upstream/route"

describe("legacy LH upstream route", () => {
  beforeEach(() => {
    process.env.LH_API_KEY = "test-key"
  })

  it("queries completions through the resolved profile id instead of scanning global rows", async () => {
    const completionQuery = {
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnValue({
        data: [
          {
            module_id: "module-9",
            created_at: "2026-04-12T08:30:00.000Z",
            metadata: { source: "portal" },
          },
        ],
        error: null,
      }),
    }

    const from = vi.fn((table: string) => {
      if (table === "profiles") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: "user-9" },
                error: null,
              }),
            }),
          }),
        }
      }

      if (table === "analytics_events") {
        return {
          select: vi.fn().mockReturnValue(completionQuery),
        }
      }

      throw new Error(`Unexpected table: ${table}`)
    })

    mocks.createAdminClient.mockResolvedValue({ from })

    const response = await GET(
      new Request(
        "http://localhost/api/lh/upstream?action=completions&key=test-key&email=learner@example.com",
      ),
    )

    expect(response.status).toBe(200)
    expect(completionQuery.eq).toHaveBeenNthCalledWith(1, "event_type", "module_complete")
    expect(completionQuery.eq).toHaveBeenNthCalledWith(2, "user_id", "user-9")
    await expect(response.json()).resolves.toEqual({
      ok: true,
      completions: [
        {
          email: "learner@example.com",
          module_id: "module-9",
          completed_at: "2026-04-12T08:30:00.000Z",
          source: "portal",
        },
      ],
    })
  })

  it("stores legacy completion writes with the resolved profile id when available", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null })
    const from = vi.fn((table: string) => {
      if (table === "profiles") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: "user-2" },
                error: null,
              }),
            }),
          }),
        }
      }

      if (table === "analytics_events") {
        return {
          insert,
        }
      }

      throw new Error(`Unexpected table: ${table}`)
    })

    mocks.createAdminClient.mockResolvedValue({ from })

    const response = await POST(
      new Request("http://localhost/api/lh/upstream?action=markComplete&key=test-key", {
        method: "POST",
        body: JSON.stringify({
          email: "learner@example.com",
          moduleId: "module-2",
          source: "portal",
        }),
      }),
    )

    expect(response.status).toBe(200)
    expect(insert).toHaveBeenCalledWith({
      user_id: "user-2",
      event_type: "module_complete",
      module_id: "module-2",
      metadata: {
        email: "learner@example.com",
        source: "portal",
        via: "lh-upstream-compat",
      },
    })
  })
})
