import { beforeEach, describe, expect, it } from "vitest"
import {
  createHrInviteToken,
  createHrUploadToken,
  verifyHrInviteToken,
  verifyHrUploadToken,
} from "@/lib/hr/tokens"

describe("hr tokens", () => {
  beforeEach(() => {
    process.env.HR_UPLOAD_TOKEN_SECRET = "super-secret-test-key"
    process.env.HR_UPLOAD_TOKEN_TTL_MINUTES = "60"
  })

  it("creates and verifies invite tokens", async () => {
    const invite = await createHrInviteToken()
    const verified = await verifyHrInviteToken(invite.token)

    expect(verified).toEqual({
      inviteId: invite.inviteId,
      tokenHash: invite.tokenHash,
    })
  })

  it("rejects malformed invite tokens", async () => {
    await expect(verifyHrInviteToken("not-a-real-token")).resolves.toBeNull()
  })

  it("creates and verifies upload tokens", async () => {
    const upload = await createHrUploadToken(
      "11111111-1111-4111-8111-111111111111",
      "22222222-2222-4222-8222-222222222222",
      "scanner-fingerprint-1234567890",
    )

    const verified = await verifyHrUploadToken(upload.token)
    expect(verified?.sessionId).toBe("11111111-1111-4111-8111-111111111111")
    expect(verified?.inviteId).toBe("22222222-2222-4222-8222-222222222222")
    expect(verified?.scannerFingerprint).toBe("scanner-fingerprint-1234567890")
  })
})
