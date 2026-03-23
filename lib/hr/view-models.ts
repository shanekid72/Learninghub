import type { Json } from "@/lib/supabase/database.types"
import type { HrReviewOutcome, HrRiskSummary, HrSessionEventType, HrSessionStatus } from "@/lib/hr/contracts"

export interface HrInviteSnapshot {
  expiresAt: string
  pairedAt: string | null
  revokedAt: string | null
  usedAt: string | null
}

export interface HrSessionListItem {
  activeInvite: HrInviteSnapshot | null
  candidateEmail: string
  candidateName: string
  completedAt: string | null
  createdAt: string
  id: string
  jobTitle: string
  latestSummary: HrRiskSummary | null
  monitoringStartedAt: string | null
  pairedAt: string | null
  reviewNotes: string | null
  reviewOutcome: HrReviewOutcome
  reviewedAt: string | null
  scheduledAt: string | null
  status: HrSessionStatus
  updatedAt: string
}

export interface HrSessionEventItem {
  actorProfileId: string | null
  createdAt: string
  eventType: HrSessionEventType
  id: string
  payload: Json
  summary: HrRiskSummary | null
}

export interface HrSessionDetail extends HrSessionListItem {
  events: HrSessionEventItem[]
}

export interface HrInviteValidationResult {
  inviteId: string | null
  reason:
    | "completed"
    | "expired"
    | "invalid"
    | "paired"
    | "revoked"
    | "reviewed"
    | "valid"
  session: HrSessionListItem | null
  valid: boolean
}
