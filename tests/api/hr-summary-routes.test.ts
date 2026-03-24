import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  createAdminClient: vi.fn(),
  getBearerToken: vi.fn(),
  isHrIntegrityEnabled: vi.fn(),
  recordHrSummaryEvent: vi.fn(),
}))

vi.mock("@/lib/hr/feature", () => ({
  isHrIntegrityEnabled: mocks.isHrIntegrityEnabled,
}))

vi.mock("@/lib/hr/server", () => ({
  getBearerToken: mocks.getBearerToken,
  recordHrSummaryEvent: mocks.recordHrSummaryEvent,
}))

vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: mocks.createAdminClient,
}))

import { POST as completePost } from "@/app/api/hr/complete/route"
import { POST as heartbeatPost } from "@/app/api/hr/heartbeat/route"

const signedHeartbeatPayload = {
  envelope: {
    eventType: "heartbeat",
    inviteId: "22222222-2222-4222-8222-222222222222",
    sequence: 2,
    sessionId: "11111111-1111-4111-8111-111111111111",
    signedAt: "2026-03-24T00:00:00.000Z",
    summary: {
      displayCount: 1,
      highMemoryCount: 2,
      networkProcessCount: 1,
      suspiciousCount: 0,
      interviewCoderDetected: false,
    },
  },
  signature: "signature-1234567890-signature-1234567890",
}

describe("HR summary routes", () => {
  beforeEach(() => {
    mocks.isHrIntegrityEnabled.mockReturnValue(true)
    mocks.getBearerToken.mockReturnValue("upload-token")
    mocks.createAdminClient.mockResolvedValue({})
  })

  it("returns 403 when heartbeat signatures fail verification", async () => {
    mocks.recordHrSummaryEvent.mockResolvedValue({
      ok: false,
      error: "invalid_signature",
    })

    const response = await heartbeatPost(
      new Request("http://localhost/api/hr/heartbeat", {
        method: "POST",
        body: JSON.stringify(signedHeartbeatPayload),
      }),
    )

    expect(response.status).toBe(403)
  })

  it("returns accepted sequence numbers on successful completion", async () => {
    mocks.recordHrSummaryEvent.mockResolvedValue({
      ok: true,
      acceptedSequence: 7,
    })

    const response = await completePost(
      new Request("http://localhost/api/hr/complete", {
        method: "POST",
        body: JSON.stringify({
          ...signedHeartbeatPayload,
          envelope: {
            ...signedHeartbeatPayload.envelope,
            eventType: "completed",
          },
        }),
      }),
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ acceptedSequence: 7 })
  })
})
