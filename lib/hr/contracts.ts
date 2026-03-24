export const HR_RISK_FLAGS = [
  "MULTIPLE_DISPLAYS",
  "INTERVIEW_CODER_DETECTED",
  "SUSPICIOUS_HIGH_MEMORY_NETWORK_PROCESS",
] as const

export const HR_RISK_LEVELS = ["low", "medium", "high"] as const
export const HR_SESSION_STATUSES = [
  "draft",
  "invited",
  "paired",
  "monitoring",
  "completed",
  "reviewed",
  "cancelled",
  "expired",
] as const
export const HR_REVIEW_OUTCOMES = ["pending", "clear", "flagged", "follow_up"] as const
export const HR_EVENT_TYPES = [
  "invite_sent",
  "paired",
  "baseline",
  "heartbeat",
  "completed",
  "reviewed",
] as const
export const HR_UPLOAD_EVENT_TYPES = ["baseline", "heartbeat", "completed"] as const

export type HrRiskFlag = (typeof HR_RISK_FLAGS)[number]
export type HrRiskLevel = (typeof HR_RISK_LEVELS)[number]
export type HrSessionStatus = (typeof HR_SESSION_STATUSES)[number]
export type HrReviewOutcome = (typeof HR_REVIEW_OUTCOMES)[number]
export type HrSessionEventType = (typeof HR_EVENT_TYPES)[number]
export type HrUploadEventType = (typeof HR_UPLOAD_EVENT_TYPES)[number]

export interface HrRiskSummary {
  flags: HrRiskFlag[]
  riskLevel: HrRiskLevel
  displayCount: number
  highMemoryCount: number
  networkProcessCount: number
  suspiciousCount: number
  interviewCoderDetected: boolean
  monitoringStartedAt: string
  lastUpdatedAt: string
  scannerVersion: string
  platform: string
}

export interface HrRiskSummaryInput {
  flags?: HrRiskFlag[] | null
  displayCount?: number | null
  highMemoryCount?: number | null
  networkProcessCount?: number | null
  suspiciousCount?: number | null
  interviewCoderDetected?: boolean | null
  monitoringStartedAt?: string | null
  lastUpdatedAt?: string | null
  scannerVersion?: string | null
  platform?: string | null
}

function toSafeCount(value: number | null | undefined): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.round(value || 0))
}

export function deriveHrRiskFlags(input: HrRiskSummaryInput): HrRiskFlag[] {
  const flags = new Set<HrRiskFlag>()
  const explicitFlags = input.flags || []

  for (const explicitFlag of explicitFlags) {
    if (HR_RISK_FLAGS.includes(explicitFlag)) {
      flags.add(explicitFlag)
    }
  }

  if (toSafeCount(input.displayCount) > 1) {
    flags.add("MULTIPLE_DISPLAYS")
  }

  if (Boolean(input.interviewCoderDetected)) {
    flags.add("INTERVIEW_CODER_DETECTED")
  }

  if (toSafeCount(input.suspiciousCount) > 0) {
    flags.add("SUSPICIOUS_HIGH_MEMORY_NETWORK_PROCESS")
  }

  return HR_RISK_FLAGS.filter((flag) => flags.has(flag))
}

export function deriveHrRiskLevel(flags: HrRiskFlag[]): HrRiskLevel {
  if (
    flags.includes("INTERVIEW_CODER_DETECTED") ||
    flags.includes("SUSPICIOUS_HIGH_MEMORY_NETWORK_PROCESS")
  ) {
    return "high"
  }

  if (flags.includes("MULTIPLE_DISPLAYS")) {
    return "medium"
  }

  return "low"
}

export function normalizeHrRiskSummary(
  input: HrRiskSummaryInput,
  now: string = new Date().toISOString(),
): HrRiskSummary {
  const flags = deriveHrRiskFlags(input)

  return {
    flags,
    riskLevel: deriveHrRiskLevel(flags),
    displayCount: toSafeCount(input.displayCount),
    highMemoryCount: toSafeCount(input.highMemoryCount),
    networkProcessCount: toSafeCount(input.networkProcessCount),
    suspiciousCount: toSafeCount(input.suspiciousCount),
    interviewCoderDetected: Boolean(input.interviewCoderDetected),
    monitoringStartedAt: input.monitoringStartedAt || now,
    lastUpdatedAt: input.lastUpdatedAt || now,
    scannerVersion: input.scannerVersion?.trim() || "unknown",
    platform: input.platform?.trim() || "unknown",
  }
}
