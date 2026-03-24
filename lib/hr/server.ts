import { sendEmail, isEmailProviderConfigured } from "@/lib/email"
import {
  HR_EVENT_TYPES,
  HR_REVIEW_OUTCOMES,
  normalizeHrRiskSummary,
  type HrReviewOutcome,
  type HrRiskSummary,
  type HrSessionEventType,
  type HrSessionStatus,
  type HrUploadEventType,
} from "@/lib/hr/contracts"
import { getHrBaseUrl, getHrInviteTtlHours } from "@/lib/hr/feature"
import { createHrInviteToken, createHrUploadToken, verifyHrInviteToken, verifyHrUploadToken } from "@/lib/hr/tokens"
import {
  fingerprintHrScannerPublicKey,
  verifyHrSummaryEnvelopeSignature,
  type HrSignedSummaryEnvelope,
} from "@/lib/hr/upload-signing"
import type {
  HrInviteSnapshot,
  HrInviteValidationResult,
  HrPairSessionResult,
  HrPublicInviteSession,
  HrScannerSessionSnapshot,
  HrSessionDetail,
  HrSessionListItem,
} from "@/lib/hr/view-models"
import { createAdminClient } from "@/lib/supabase/server"
import type { Json, Tables } from "@/lib/supabase/database.types"

type AdminSupabaseClient = Awaited<ReturnType<typeof createAdminClient>>
type HrSessionRow = Tables<"hr_sessions">
type HrSessionInviteRow = Tables<"hr_session_invites">
type HrSessionEventRow = Tables<"hr_session_events">
type HrSessionSecurityFields = {
  scanner_key_fingerprint: string | null
  scanner_last_sequence: number | null
  scanner_public_key: string | null
}
type HrSessionSecurityRow = HrSessionRow & HrSessionSecurityFields
type HrSessionIdResult = Promise<{
  data: Pick<HrSessionRow, "id"> | null
  error: unknown
}>
type HrSessionUpdateQuery = {
  eq(column: string, value: string | number | null): HrSessionUpdateQuery
  is(column: string, value: null): HrSessionUpdateQuery
  select(columns: "id"): {
    maybeSingle(): HrSessionIdResult
  }
}
type HrSessionUpdateBuilder = {
  update(values: Record<string, unknown>): HrSessionUpdateQuery
}

type HrPairSessionOptions = {
  platform?: string
  scannerFingerprint?: string
  scannerPublicKey: string
  scannerVersion?: string
  token: string
}

type HrSummaryEventFailure =
  | "invalid_payload"
  | "invalid_signature"
  | "invalid_token"
  | "not_allowed"
  | "sequence_conflict"

type HrSummaryEventSuccess = {
  acceptedSequence: number
  ok: true
}

type HrSummaryEventResult =
  | HrSummaryEventSuccess
  | {
      error: HrSummaryEventFailure
      ok: false
    }

function isObject(value: Json | null): value is Record<string, Json | undefined> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function asHrInviteSnapshot(invite: HrSessionInviteRow | null | undefined): HrInviteSnapshot | null {
  if (!invite) return null

  return {
    expiresAt: invite.expires_at,
    pairedAt: invite.paired_at,
    revokedAt: invite.revoked_at,
    usedAt: invite.used_at,
  }
}

function parseHrSummary(value: Json | null): HrRiskSummary | null {
  if (!isObject(value)) {
    return null
  }

  return normalizeHrRiskSummary({
    flags: Array.isArray(value.flags)
      ? value.flags.filter((flag): flag is HrRiskSummary["flags"][number] => typeof flag === "string")
      : undefined,
    displayCount: typeof value.displayCount === "number" ? value.displayCount : undefined,
    highMemoryCount: typeof value.highMemoryCount === "number" ? value.highMemoryCount : undefined,
    networkProcessCount: typeof value.networkProcessCount === "number" ? value.networkProcessCount : undefined,
    suspiciousCount: typeof value.suspiciousCount === "number" ? value.suspiciousCount : undefined,
    interviewCoderDetected:
      typeof value.interviewCoderDetected === "boolean" ? value.interviewCoderDetected : undefined,
    monitoringStartedAt:
      typeof value.monitoringStartedAt === "string" ? value.monitoringStartedAt : undefined,
    lastUpdatedAt: typeof value.lastUpdatedAt === "string" ? value.lastUpdatedAt : undefined,
    scannerVersion: typeof value.scannerVersion === "string" ? value.scannerVersion : undefined,
    platform: typeof value.platform === "string" ? value.platform : undefined,
  })
}

function toSummaryJson(summary: HrRiskSummary): Json {
  return summary as unknown as Json
}

function normalizePublicKey(publicKey: string): string {
  return publicKey.trim().replace(/\s+/g, "")
}

function hrSessionsUpdateBuilder(supabase: AdminSupabaseClient): HrSessionUpdateBuilder {
  return supabase.from("hr_sessions") as unknown as HrSessionUpdateBuilder
}

function buildSessionListItem(
  session: HrSessionRow,
  invite: HrSessionInviteRow | null | undefined,
): HrSessionListItem {
  return {
    id: session.id,
    candidateName: session.candidate_name,
    candidateEmail: session.candidate_email,
    jobTitle: session.job_title,
    scheduledAt: session.scheduled_at,
    status: session.status as HrSessionStatus,
    latestSummary: parseHrSummary(session.latest_summary),
    reviewOutcome: (session.review_outcome || "pending") as HrReviewOutcome,
    reviewNotes: session.review_notes,
    createdAt: session.created_at,
    updatedAt: session.updated_at,
    pairedAt: session.paired_at,
    monitoringStartedAt: session.monitoring_started_at,
    completedAt: session.completed_at,
    reviewedAt: session.reviewed_at,
    activeInvite: asHrInviteSnapshot(invite),
  }
}

function buildSessionDetail(
  session: HrSessionRow,
  invite: HrSessionInviteRow | null | undefined,
  events: HrSessionEventRow[],
): HrSessionDetail {
  return {
    ...buildSessionListItem(session, invite),
    events: events.map((event) => ({
      id: event.id,
      actorProfileId: event.actor_profile_id,
      createdAt: event.created_at,
      eventType: event.event_type as HrSessionEventType,
      payload: event.payload || {},
      summary: isObject(event.payload) && event.payload.summary ? parseHrSummary(event.payload.summary as Json) : null,
    })),
  }
}

function buildPublicInviteSession(
  session: HrSessionRow,
  invite: HrSessionInviteRow | null | undefined,
): HrPublicInviteSession {
  return {
    candidateName: session.candidate_name,
    inviteExpiresAt: invite?.expires_at || null,
    jobTitle: session.job_title,
    scheduledAt: session.scheduled_at,
    status: session.status as HrSessionStatus,
  }
}

function buildScannerSessionSnapshot(
  session: HrSessionRow,
  invite: HrSessionInviteRow | null | undefined,
): HrScannerSessionSnapshot {
  return {
    candidateName: session.candidate_name,
    inviteExpiresAt: invite?.expires_at || null,
    jobTitle: session.job_title,
    scheduledAt: session.scheduled_at,
    sessionId: session.id,
  }
}

function buildInviteUrl(requestUrl: string, token: string): string {
  const baseUrl = getHrBaseUrl(requestUrl)
  return `${baseUrl}/hr/interview/${encodeURIComponent(token)}`
}

async function insertHrEvent(
  supabase: AdminSupabaseClient,
  sessionId: string,
  eventType: HrSessionEventType,
  payload: Json,
  actorProfileId?: string | null,
) {
  const { error } = await supabase.from("hr_session_events").insert({
    session_id: sessionId,
    event_type: eventType,
    payload,
    actor_profile_id: actorProfileId || null,
  })

  if (error) {
    throw error
  }
}

async function getLatestInviteBySessionId(
  supabase: AdminSupabaseClient,
  sessionId: string,
): Promise<HrSessionInviteRow | null> {
  const { data, error } = await supabase
    .from("hr_session_invites")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
}

async function getInviteAndSessionByToken(
  supabase: AdminSupabaseClient,
  token: string,
): Promise<{ invite: HrSessionInviteRow | null; session: HrSessionRow | null }> {
  const verified = await verifyHrInviteToken(token)
  if (!verified) {
    return { invite: null, session: null }
  }

  const { data: invite, error: inviteError } = await supabase
    .from("hr_session_invites")
    .select("*")
    .eq("id", verified.inviteId)
    .maybeSingle()

  if (inviteError) {
    throw inviteError
  }

  if (!invite || invite.token_hash !== verified.tokenHash) {
    return { invite: null, session: null }
  }

  const { data: session, error: sessionError } = await supabase
    .from("hr_sessions")
    .select("*")
    .eq("id", invite.session_id)
    .maybeSingle()

  if (sessionError) {
    throw sessionError
  }

  return {
    invite,
    session,
  }
}

function isInviteExpired(invite: HrSessionInviteRow): boolean {
  return new Date(invite.expires_at).getTime() <= Date.now()
}

export function canPairSession(session: HrSessionRow, invite: HrSessionInviteRow): boolean {
  if (invite.revoked_at || invite.used_at || isInviteExpired(invite)) {
    return false
  }

  return session.status === "invited"
}

function buildInviteEmailData(inviteUrl: string, expiresAt: string, jobTitle: string, candidateName: string) {
  return {
    candidateName,
    jobTitle,
    inviteUrl,
    expiresAt,
  }
}

function isUploadBlocked(status: HrSessionStatus): boolean {
  return ["completed", "reviewed", "cancelled", "expired"].includes(status)
}

export async function issueHrInvite(options: {
  actorProfileId: string
  candidateEmail: string
  candidateName: string
  jobTitle: string
  requestUrl: string
  sendEmail?: boolean
  sessionId: string
  supabase: AdminSupabaseClient
}) {
  const now = new Date()
  const expiresAt = new Date(now.getTime() + getHrInviteTtlHours() * 3600 * 1000).toISOString()

  const { token, inviteId, tokenHash } = await createHrInviteToken()

  const { error: revokeError } = await options.supabase
    .from("hr_session_invites")
    .update({ revoked_at: now.toISOString() })
    .eq("session_id", options.sessionId)
    .is("revoked_at", null)
    .is("used_at", null)

  if (revokeError) {
    throw revokeError
  }

  const { data: invite, error: inviteError } = await options.supabase
    .from("hr_session_invites")
    .insert({
      id: inviteId,
      session_id: options.sessionId,
      token_hash: tokenHash,
      expires_at: expiresAt,
      created_by: options.actorProfileId,
    })
    .select("*")
    .single()

  if (inviteError) {
    throw inviteError
  }

  const inviteUrl = buildInviteUrl(options.requestUrl, token)
  const shouldSendEmail = options.sendEmail ?? isEmailProviderConfigured()
  let emailSent = false
  let emailError: string | null = null

  if (shouldSendEmail) {
    const result = await sendEmail({
      to: options.candidateEmail,
      type: "hr_invite",
      data: buildInviteEmailData(
        inviteUrl,
        expiresAt,
        options.jobTitle,
        options.candidateName,
      ),
    })

    emailSent = result.success
    emailError = result.success ? null : String(result.error || "Failed to send HR invite")
  }

  await insertHrEvent(
    options.supabase,
    options.sessionId,
    "invite_sent",
    {
      inviteId,
      inviteExpiresAt: expiresAt,
      emailSent,
      emailError,
    },
    options.actorProfileId,
  )

  return {
    emailError,
    emailSent,
    invite,
    inviteUrl,
  }
}

export async function listHrSessions(
  supabase: AdminSupabaseClient,
): Promise<HrSessionListItem[]> {
  const [{ data: sessions, error: sessionsError }, { data: invites, error: invitesError }] =
    await Promise.all([
      supabase.from("hr_sessions").select("*").order("created_at", { ascending: false }),
      supabase.from("hr_session_invites").select("*").order("created_at", { ascending: false }),
    ])

  if (sessionsError) {
    throw sessionsError
  }
  if (invitesError) {
    throw invitesError
  }

  const latestInviteBySessionId = new Map<string, HrSessionInviteRow>()
  for (const invite of invites || []) {
    if (!latestInviteBySessionId.has(invite.session_id)) {
      latestInviteBySessionId.set(invite.session_id, invite)
    }
  }

  return (sessions || []).map((session) =>
    buildSessionListItem(session, latestInviteBySessionId.get(session.id)),
  )
}

export async function getHrSessionDetail(
  supabase: AdminSupabaseClient,
  sessionId: string,
): Promise<HrSessionDetail | null> {
  const [{ data: session, error: sessionError }, invite, { data: events, error: eventsError }] =
    await Promise.all([
      supabase.from("hr_sessions").select("*").eq("id", sessionId).maybeSingle(),
      getLatestInviteBySessionId(supabase, sessionId),
      supabase
        .from("hr_session_events")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: false }),
    ])

  if (sessionError) {
    throw sessionError
  }

  if (eventsError) {
    throw eventsError
  }

  if (!session) {
    return null
  }

  return buildSessionDetail(session, invite, events || [])
}

export async function getHrInviteValidation(
  supabase: AdminSupabaseClient,
  token: string,
): Promise<HrInviteValidationResult> {
  const { invite, session } = await getInviteAndSessionByToken(supabase, token)
  if (!invite || !session) {
    return { valid: false, reason: "invalid", session: null, inviteId: null }
  }

  const latestInvite = await getLatestInviteBySessionId(supabase, session.id)
  const sessionSnapshot = buildPublicInviteSession(session, latestInvite || invite)

  if (invite.revoked_at) {
    return { valid: false, reason: "revoked", session: sessionSnapshot, inviteId: invite.id }
  }

  if (isInviteExpired(invite)) {
    if (session.status === "invited") {
      await supabase
        .from("hr_sessions")
        .update({ status: "expired" })
        .eq("id", session.id)
        .eq("status", "invited")
    }

    return { valid: false, reason: "expired", session: sessionSnapshot, inviteId: invite.id }
  }

  if (session.status === "reviewed") {
    return { valid: false, reason: "reviewed", session: sessionSnapshot, inviteId: invite.id }
  }

  if (session.status === "completed") {
    return { valid: false, reason: "completed", session: sessionSnapshot, inviteId: invite.id }
  }

  if (invite.used_at || ["paired", "monitoring"].includes(session.status)) {
    return { valid: false, reason: "paired", session: sessionSnapshot, inviteId: invite.id }
  }

  return { valid: true, reason: "valid", session: sessionSnapshot, inviteId: invite.id }
}

export async function pairHrSession(
  supabase: AdminSupabaseClient,
  options: HrPairSessionOptions,
): Promise<
  | { error: "invalid" | "not_allowed" | "not_found" }
  | HrPairSessionResult
> {
  const { invite, session } = await getInviteAndSessionByToken(supabase, options.token)
  if (!invite) {
    return { error: "invalid" }
  }

  if (!session) {
    return { error: "not_found" }
  }

  if (!canPairSession(session, invite)) {
    return { error: "not_allowed" }
  }

  const scannerPublicKey = normalizePublicKey(options.scannerPublicKey)
  let scannerFingerprint: string

  try {
    scannerFingerprint = await fingerprintHrScannerPublicKey(scannerPublicKey)
  } catch {
    return { error: "invalid" }
  }

  if (options.scannerFingerprint && options.scannerFingerprint !== scannerFingerprint) {
    return { error: "invalid" }
  }

  const pairedAt = new Date().toISOString()
  const { data: claimedInvite, error: inviteError } = await supabase
    .from("hr_session_invites")
    .update({
      paired_at: pairedAt,
      used_at: pairedAt,
    })
    .eq("id", invite.id)
    .is("used_at", null)
    .is("revoked_at", null)
    .gt("expires_at", pairedAt)
    .select("id")
    .maybeSingle()

  if (inviteError) {
    throw inviteError
  }

  if (!claimedInvite) {
    return { error: "not_allowed" }
  }

  const { data: claimedSession, error: sessionError } = await hrSessionsUpdateBuilder(supabase)
    .update({
      status: "paired",
      paired_at: pairedAt,
      scanner_public_key: scannerPublicKey,
      scanner_key_fingerprint: scannerFingerprint,
      scanner_last_sequence: 0,
    })
    .eq("id", session.id)
    .eq("status", "invited")
    .select("id")
    .maybeSingle()

  if (sessionError) {
    throw sessionError
  }

  if (!claimedSession) {
    return { error: "not_allowed" }
  }

  await insertHrEvent(
    supabase,
    session.id,
    "paired",
    {
      inviteId: invite.id,
      pairedAt,
      platform: options.platform || null,
      scannerFingerprint,
      scannerVersion: options.scannerVersion || null,
    },
    null,
  )

  const latestInvite = await getLatestInviteBySessionId(supabase, session.id)
  const { token: uploadToken, expiresAt: uploadTokenExpiresAt } = await createHrUploadToken(
    session.id,
    invite.id,
    scannerFingerprint,
  )

  return {
    inviteId: invite.id,
    scannerFingerprint,
    session: buildScannerSessionSnapshot(session, latestInvite || invite),
    uploadToken,
    uploadTokenExpiresAt,
  }
}

async function getSessionFromUploadToken(supabase: AdminSupabaseClient, token: string) {
  const payload = await verifyHrUploadToken(token)
  if (!payload) {
    return null
  }

  const [{ data: rawSession, error: sessionError }, { data: invite, error: inviteError }] =
    await Promise.all([
      supabase.from("hr_sessions").select("*").eq("id", payload.sessionId).maybeSingle(),
      supabase.from("hr_session_invites").select("*").eq("id", payload.inviteId).maybeSingle(),
    ])

  if (sessionError) {
    throw sessionError
  }
  if (inviteError) {
    throw inviteError
  }

  const session = rawSession as HrSessionSecurityRow | null

  if (!session || !invite || invite.session_id !== session.id) {
    return null
  }

  if (
    !session.scanner_public_key ||
    !session.scanner_key_fingerprint ||
    session.scanner_key_fingerprint !== payload.scannerFingerprint
  ) {
    return null
  }

  return { invite, payload, session }
}

export async function recordHrSummaryEvent(options: {
  actorProfileId?: string | null
  authToken: string
  envelope: HrSignedSummaryEnvelope
  eventType: HrUploadEventType
  signature: string
  supabase: AdminSupabaseClient
}): Promise<HrSummaryEventResult> {
  const auth = await getSessionFromUploadToken(options.supabase, options.authToken)
  if (!auth) {
    return { ok: false, error: "invalid_token" }
  }

  const sessionStatus = auth.session.status as HrSessionStatus
  if (isUploadBlocked(sessionStatus)) {
    return { ok: false, error: "not_allowed" }
  }

  if (
    options.envelope.eventType !== options.eventType ||
    options.envelope.inviteId !== auth.invite.id ||
    options.envelope.sessionId !== auth.session.id
  ) {
    return { ok: false, error: "invalid_payload" }
  }

  const scannerPublicKey = auth.session.scanner_public_key!
  const signatureValid = await verifyHrSummaryEnvelopeSignature(
    scannerPublicKey,
    options.envelope,
    options.signature,
  )

  if (!signatureValid) {
    return { ok: false, error: "invalid_signature" }
  }

  const currentSequence = auth.session.scanner_last_sequence || 0
  if (options.envelope.sequence <= currentSequence) {
    return { ok: false, error: "sequence_conflict" }
  }

  const now = new Date().toISOString()
  const summary = normalizeHrRiskSummary(
    {
      ...options.envelope.summary,
      monitoringStartedAt:
        options.envelope.summary.monitoringStartedAt ||
        auth.session.monitoring_started_at ||
        now,
      lastUpdatedAt: now,
    },
    now,
  )

  const updates: Record<string, unknown> = {
    latest_summary: toSummaryJson(summary),
    scanner_last_sequence: options.envelope.sequence,
    status: options.eventType === "completed" ? "completed" : "monitoring",
  }

  if (!auth.session.monitoring_started_at) {
    updates.monitoring_started_at = summary.monitoringStartedAt
  }

  if (options.eventType === "completed") {
    updates.completed_at = now
  }

  let updateQuery = hrSessionsUpdateBuilder(options.supabase)
    .update(updates)
    .eq("id", auth.session.id)
    .eq("scanner_last_sequence", currentSequence)

  if (options.eventType === "completed") {
    updateQuery = updateQuery.is("completed_at", null)
  }

  const { data: updatedSession, error: updateError } = await updateQuery
    .select("id")
    .maybeSingle()

  if (updateError) {
    throw updateError
  }

  if (!updatedSession) {
    return { ok: false, error: "sequence_conflict" }
  }

  await insertHrEvent(
    options.supabase,
    auth.session.id,
    options.eventType === "completed" ? "completed" : options.eventType,
    {
      scannerFingerprint: auth.session.scanner_key_fingerprint,
      sequence: options.envelope.sequence,
      signedAt: options.envelope.signedAt,
      summary: toSummaryJson(summary),
    },
    options.actorProfileId || null,
  )

  return {
    ok: true,
    acceptedSequence: options.envelope.sequence,
  }
}

export async function reviewHrSession(options: {
  actorProfileId: string
  reviewNotes?: string
  reviewOutcome?: HrReviewOutcome
  sessionId: string
  supabase: AdminSupabaseClient
}) {
  const current = await getHrSessionDetail(options.supabase, options.sessionId)
  if (!current) {
    return null
  }

  const nextOutcome = options.reviewOutcome || current.reviewOutcome || "pending"
  const now = new Date().toISOString()
  const nextStatus =
    nextOutcome === "pending"
      ? current.status === "reviewed"
        ? "completed"
        : current.status
      : "reviewed"

  const updates: Partial<HrSessionRow> = {
    review_outcome: nextOutcome,
    review_notes: options.reviewNotes ?? current.reviewNotes,
    reviewed_by: options.actorProfileId,
    reviewed_at: nextOutcome === "pending" ? null : now,
    status: nextStatus,
  }

  const { error } = await options.supabase
    .from("hr_sessions")
    .update(updates)
    .eq("id", options.sessionId)

  if (error) {
    throw error
  }

  await insertHrEvent(
    options.supabase,
    options.sessionId,
    "reviewed",
    {
      reviewNotes: updates.review_notes || null,
      reviewOutcome: nextOutcome,
    },
    options.actorProfileId,
  )

  return getHrSessionDetail(options.supabase, options.sessionId)
}

export function getBearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization") || ""
  const [type, token] = authorization.split(" ")
  if (type?.toLowerCase() !== "bearer" || !token) {
    return null
  }

  return token
}

export const hrMeta = {
  eventTypes: HR_EVENT_TYPES,
  reviewOutcomes: HR_REVIEW_OUTCOMES,
}
