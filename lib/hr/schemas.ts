import { z } from "zod"
import {
  HR_REVIEW_OUTCOMES,
  HR_RISK_FLAGS,
  HR_RISK_LEVELS,
  type HrRiskSummaryInput,
} from "@/lib/hr/contracts"

export const hrRiskSummarySchema = z.object({
  flags: z.array(z.enum(HR_RISK_FLAGS)).optional(),
  riskLevel: z.enum(HR_RISK_LEVELS).optional(),
  displayCount: z.number().int().min(0).max(32),
  highMemoryCount: z.number().int().min(0).max(10_000),
  networkProcessCount: z.number().int().min(0).max(10_000),
  suspiciousCount: z.number().int().min(0).max(10_000),
  interviewCoderDetected: z.boolean(),
  monitoringStartedAt: z.string().datetime({ offset: true }).optional(),
  lastUpdatedAt: z.string().datetime({ offset: true }).optional(),
  scannerVersion: z.string().max(80).optional(),
  platform: z.string().max(80).optional(),
}) satisfies z.ZodType<HrRiskSummaryInput>

export const createHrSessionSchema = z.object({
  candidateName: z.string().trim().min(1).max(160),
  candidateEmail: z.string().trim().email().max(320),
  jobTitle: z.string().trim().min(1).max(160),
  scheduledAt: z.string().datetime({ offset: true }).nullable().optional(),
  sendEmail: z.boolean().optional(),
})

export const issueHrInviteSchema = z.object({
  sendEmail: z.boolean().optional(),
})

export const pairHrSessionSchema = z.object({
  token: z.string().trim().min(10).max(1024),
})

export const hrHeartbeatSchema = z.object({
  eventType: z.enum(["baseline", "heartbeat"]).optional(),
  summary: hrRiskSummarySchema,
})

export const hrCompleteSchema = z.object({
  summary: hrRiskSummarySchema,
})

export const reviewHrSessionSchema = z
  .object({
    reviewOutcome: z.enum(HR_REVIEW_OUTCOMES).optional(),
    reviewNotes: z.string().trim().max(4000).optional(),
  })
  .refine(
    (payload) => payload.reviewOutcome !== undefined || payload.reviewNotes !== undefined,
    {
      message: "At least one review field is required",
    },
  )
