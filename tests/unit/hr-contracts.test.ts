import { describe, expect, it } from "vitest"
import { deriveHrRiskFlags, deriveHrRiskLevel, normalizeHrRiskSummary } from "@/lib/hr/contracts"

describe("hr contracts", () => {
  it("derives flags from counts and detections", () => {
    const flags = deriveHrRiskFlags({
      displayCount: 2,
      suspiciousCount: 1,
      interviewCoderDetected: true,
    })

    expect(flags).toEqual([
      "MULTIPLE_DISPLAYS",
      "INTERVIEW_CODER_DETECTED",
      "SUSPICIOUS_HIGH_MEMORY_NETWORK_PROCESS",
    ])
  })

  it("treats suspicious activity as high risk", () => {
    expect(deriveHrRiskLevel(["SUSPICIOUS_HIGH_MEMORY_NETWORK_PROCESS"])).toBe("high")
    expect(deriveHrRiskLevel(["MULTIPLE_DISPLAYS"])).toBe("medium")
    expect(deriveHrRiskLevel([])).toBe("low")
  })

  it("normalizes summary defaults", () => {
    const summary = normalizeHrRiskSummary({
      displayCount: 1,
      highMemoryCount: 4,
      networkProcessCount: 2,
      suspiciousCount: 0,
      interviewCoderDetected: false,
    }, "2026-03-23T12:00:00.000Z")

    expect(summary.flags).toEqual([])
    expect(summary.riskLevel).toBe("low")
    expect(summary.monitoringStartedAt).toBe("2026-03-23T12:00:00.000Z")
    expect(summary.lastUpdatedAt).toBe("2026-03-23T12:00:00.000Z")
  })
})
