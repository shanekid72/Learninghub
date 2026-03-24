import { describe, expect, it } from "vitest"
import {
  createHrSignedSummaryEnvelope,
  fingerprintHrScannerPublicKey,
  generateHrScannerIdentity,
  signHrSummaryEnvelope,
  verifyHrSummaryEnvelopeSignature,
} from "@/lib/hr/upload-signing"

describe("hr upload signing", () => {
  it("signs and verifies scanner uploads", async () => {
    const identity = await generateHrScannerIdentity()
    const envelope = createHrSignedSummaryEnvelope({
      eventType: "baseline",
      inviteId: "22222222-2222-4222-8222-222222222222",
      sequence: 1,
      sessionId: "11111111-1111-4111-8111-111111111111",
      signedAt: "2026-03-24T00:00:00.000Z",
      summary: {
        displayCount: 1,
        highMemoryCount: 3,
        networkProcessCount: 2,
        suspiciousCount: 0,
        interviewCoderDetected: false,
      },
    })

    const signature = await signHrSummaryEnvelope(identity.privateKey, envelope)
    await expect(
      verifyHrSummaryEnvelopeSignature(identity.publicKey, envelope, signature),
    ).resolves.toBe(true)
  })

  it("rejects tampered envelopes", async () => {
    const identity = await generateHrScannerIdentity()
    const envelope = createHrSignedSummaryEnvelope({
      eventType: "heartbeat",
      inviteId: "22222222-2222-4222-8222-222222222222",
      sequence: 2,
      sessionId: "11111111-1111-4111-8111-111111111111",
      signedAt: "2026-03-24T00:00:00.000Z",
      summary: {
        displayCount: 1,
        highMemoryCount: 3,
        networkProcessCount: 2,
        suspiciousCount: 0,
        interviewCoderDetected: false,
      },
    })

    const signature = await signHrSummaryEnvelope(identity.privateKey, envelope)
    const tamperedEnvelope = {
      ...envelope,
      summary: {
        ...envelope.summary,
        suspiciousCount: 4,
      },
    }

    await expect(
      verifyHrSummaryEnvelopeSignature(identity.publicKey, tamperedEnvelope, signature),
    ).resolves.toBe(false)
  })

  it("derives deterministic scanner fingerprints", async () => {
    const identity = await generateHrScannerIdentity()

    await expect(fingerprintHrScannerPublicKey(identity.publicKey)).resolves.toBe(
      identity.fingerprint,
    )
  })
})
