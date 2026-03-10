import { describe, expect, it } from "vitest"
import { canDeleteComment, canEditComment } from "@/lib/comment-permissions"

describe("comment-permissions", () => {
  it("allows edits only for the owner", () => {
    expect(canEditComment("owner-id", "owner-id")).toBe(true)
    expect(canEditComment("owner-id", "other-user")).toBe(false)
  })

  it("allows deletes for owner and admin", () => {
    expect(canDeleteComment("owner-id", "owner-id", "user")).toBe(true)
    expect(canDeleteComment("owner-id", "other-user", "admin")).toBe(true)
    expect(canDeleteComment("owner-id", "other-user", "user")).toBe(false)
  })
})
