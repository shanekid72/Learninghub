import { describe, expect, it } from "vitest"
import { canPairSession } from "@/lib/hr/server"

describe("hr server security rules", () => {
  const baseSession = {
    status: "invited",
  }

  const baseInvite = {
    expires_at: "2099-03-24T00:00:00.000Z",
    revoked_at: null,
    used_at: null,
  }

  it("allows pairing only for fresh invited sessions", () => {
    expect(canPairSession(baseSession as never, baseInvite as never)).toBe(true)
  })

  it("rejects used or revoked invites", () => {
    expect(
      canPairSession(baseSession as never, {
        ...baseInvite,
        used_at: "2026-03-24T00:00:00.000Z",
      } as never),
    ).toBe(false)

    expect(
      canPairSession(baseSession as never, {
        ...baseInvite,
        revoked_at: "2026-03-24T00:00:00.000Z",
      } as never),
    ).toBe(false)
  })

  it("rejects non-invited or expired sessions", () => {
    expect(
      canPairSession(
        {
          ...baseSession,
          status: "paired",
        } as never,
        baseInvite as never,
      ),
    ).toBe(false)

    expect(
      canPairSession(baseSession as never, {
        ...baseInvite,
        expires_at: "2020-03-24T00:00:00.000Z",
      } as never),
    ).toBe(false)
  })
})
