import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  createAdminClient: vi.fn(),
  createClient: vi.fn(),
}))

vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: mocks.createAdminClient,
  createClient: mocks.createClient,
}))

import { getSessionContext, hasAdminRole } from "@/lib/app-session"

describe("app-session", () => {
  beforeEach(() => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
  })

  it("returns null when there is no Supabase user", async () => {
    mocks.createClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      },
    })

    await expect(getSessionContext()).resolves.toBeNull()
  })

  it("loads the authenticated user's own profile by trusted auth user id", async () => {
    const query = {
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          id: "user-1",
          email: "learner@example.com",
          role: "admin",
          full_name: "Learner Example",
          team: "QA",
        },
        error: null,
      }),
    }

    mocks.createClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: "user-1",
              email: "Learner@Example.com",
            },
          },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue(query),
      }),
    })

    await expect(getSessionContext()).resolves.toEqual({
      email: "learner@example.com",
      profile: {
        id: "user-1",
        email: "learner@example.com",
        role: "admin",
        fullName: "Learner Example",
        team: "QA",
      },
    })
    expect(query.eq).toHaveBeenCalledWith("id", "user-1")
    expect(
      hasAdminRole({
        id: "user-1",
        email: "learner@example.com",
        role: "admin",
        fullName: null,
        team: null,
      }),
    ).toBe(true)
  })

  it("falls back to a default learner profile when no profile row is visible and no service role is configured", async () => {
    const query = {
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
    }

    mocks.createClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: "user-2",
              email: "learner@example.com",
            },
          },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue(query),
      }),
    })

    await expect(getSessionContext()).resolves.toEqual({
      email: "learner@example.com",
      profile: {
        id: "user-2",
        email: "learner@example.com",
        role: "learner",
        fullName: null,
        team: null,
      },
    })
    expect(mocks.createAdminClient).not.toHaveBeenCalled()
  })

  it("uses the service-role profile lookup when the user profile row is not directly visible", async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key"

    const ownProfileQuery = {
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
    }
    const adminProfileQuery = {
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          id: "user-3",
          email: "learner@example.com",
          role: "learner",
          full_name: "Fallback Profile",
          team: "Infra",
        },
        error: null,
      }),
    }

    mocks.createClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: "user-3",
              email: "learner@example.com",
            },
          },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue(ownProfileQuery),
      }),
    })
    mocks.createAdminClient.mockResolvedValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue(adminProfileQuery),
      }),
    })

    await expect(getSessionContext()).resolves.toEqual({
      email: "learner@example.com",
      profile: {
        id: "user-3",
        email: "learner@example.com",
        role: "learner",
        fullName: "Fallback Profile",
        team: "Infra",
      },
    })
    expect(mocks.createAdminClient).toHaveBeenCalledOnce()
  })
})
