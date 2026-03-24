import { z } from "zod"
import {
  HR_REVIEW_OUTCOMES,
  HR_RISK_FLAGS,
  HR_RISK_LEVELS,
  HR_UPLOAD_EVENT_TYPES,
  type HrRiskSummaryInput,
} from "@/lib/hr/contracts"

const base64UrlSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9\-_]+$/, "Expected base64url-encoded content")

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

export const validateHrInviteSchema = z.object({
  token: z.string().trim().min(10).max(1024),
})

export const pairHrSessionSchema = z.object({
  platform: z.string().trim().max(80).optional(),
  scannerFingerprint: base64UrlSchema.min(20).max(120).optional(),
  scannerPublicKey: base64UrlSchema.min(80).max(4096),
  scannerVersion: z.string().trim().max(80).optional(),
  token: z.string().trim().min(10).max(1024),
})

const hrSignedSummaryEnvelopeSchema = z.object({
  eventType: z.enum(HR_UPLOAD_EVENT_TYPES),
  inviteId: z.string().uuid(),
  sequence: z.number().int().min(1).max(1_000_000),
  sessionId: z.string().uuid(),
  signedAt: z.string().datetime({ offset: true }),
  summary: hrRiskSummarySchema,
})

const hrSignedSummaryUploadSchema = z.object({
  envelope: hrSignedSummaryEnvelopeSchema,
  signature: base64UrlSchema.min(40).max(1024),
})

export const hrHeartbeatSchema = hrSignedSummaryUploadSchema.refine(
  (payload) => payload.envelope.eventType !== "completed",
  {
    message: "Heartbeat uploads cannot mark a session complete",
    path: ["envelope", "eventType"],
  },
)

export const hrCompleteSchema = hrSignedSummaryUploadSchema.refine(
  (payload) => payload.envelope.eventType === "completed",
  {
    message: "Completion uploads must use the completed event type",
    path: ["envelope", "eventType"],
  },
)

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
