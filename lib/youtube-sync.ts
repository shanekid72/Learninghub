import { createHash } from "crypto"
import { sendEmail } from "@/lib/email"
import { createAdminClient } from "@/lib/supabase/server"
import type { Database, Json } from "@/lib/supabase/database.types"
import {
  getYoutubeAccessToken,
  getYoutubeSyncConfig,
  getYoutubeVideos,
  isYoutubeSyncConfigured,
  listYoutubeUploadPage,
  normalizeYoutubeVideo,
  resolveYoutubeChannel,
  type YoutubeResolvedChannel,
  type YoutubeSyncConfig,
  type YoutubeUploadCandidate,
} from "@/lib/youtube"

type LearningModuleRow = Database["public"]["Tables"]["learning_modules"]["Row"]
type LearningModuleInsert = Database["public"]["Tables"]["learning_modules"]["Insert"]
type LearningModuleUpdate = Database["public"]["Tables"]["learning_modules"]["Update"]
type YoutubeSyncStateRow = Database["public"]["Tables"]["youtube_sync_state"]["Row"]
type YoutubeSyncStateInsert = Database["public"]["Tables"]["youtube_sync_state"]["Insert"]

type SyncTrigger = "manual" | "cron"

export type YoutubeSyncRunStats = {
  scanned: number
  imported: number
  updated: number
  markedRemoved: number
  skippedIneligible: number
  failed: number
  notifiedAdmins: number
}

export type YoutubeSyncResult = {
  success: boolean
  enabled: boolean
  configured: boolean
  skipped?: string
  trigger: SyncTrigger
  channelId: string | null
  channelTitle: string | null
  stats: YoutubeSyncRunStats
  importedVideos: Array<{ moduleId: string; title: string; videoId: string }>
  state: {
    lastCheckedAt: string | null
    lastSuccessAt: string | null
    lastSeenVideoPublishedAt: string | null
    lastError: string | null
    lastErrorFingerprint: string | null
    uploadsPlaylistId: string | null
  } | null
}

export type YoutubeSyncStatusPayload = {
  enabled: boolean
  configured: boolean
  channelId: string | null
  lookbackHours: number
  pendingReviewCount: number
  state: {
    lastCheckedAt: string | null
    lastSuccessAt: string | null
    lastSeenVideoPublishedAt: string | null
    lastError: string | null
    lastErrorFingerprint: string | null
    uploadsPlaylistId: string | null
  } | null
}

const OBJECTIVE_PLACEHOLDER = "Auto-imported from YouTube. Add a learning objective before publishing."
const UNKNOWN_UPLOADS_PLAYLIST_ID = "__unresolved__"

function getAdminModulesUrl(): string {
  const base = process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  return `${base.replace(/\/+$/, "")}/admin/modules`
}

function createModuleId(videoId: string): string {
  return `yt_${videoId}`
}

function createErrorFingerprint(message: string): string {
  return createHash("sha256").update(message).digest("hex")
}

function isEligibleVideo(candidate: YoutubeUploadCandidate, channel: YoutubeResolvedChannel): boolean {
  return (
    candidate.channelId === channel.channelId &&
    candidate.privacyStatus === "unlisted" &&
    candidate.embeddable
  )
}

function sanitizeSourcePayload(candidate: YoutubeUploadCandidate | null): Json | null {
  if (!candidate) return null
  return candidate.raw as unknown as Json
}

async function loadSyncState(channelId: string): Promise<YoutubeSyncStateRow | null> {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from("youtube_sync_state")
    .select("*")
    .eq("channel_id", channelId)
    .maybeSingle()

  if (error) throw error
  return data
}

async function writeSyncState(payload: YoutubeSyncStateInsert) {
  const supabase = await createAdminClient()
  const { error } = await supabase
    .from("youtube_sync_state")
    .upsert(payload, { onConflict: "channel_id" })

  if (error) throw error
}

async function listAdminRecipients() {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name")
    .eq("role", "admin")

  if (error) throw error
  return (data || []).filter((profile) => profile.email)
}

async function sendImportSummaryEmails(
  importedVideos: Array<{ moduleId: string; title: string; videoId: string }>,
  channelId: string,
): Promise<number> {
  if (importedVideos.length === 0) return 0
  const admins = await listAdminRecipients()
  if (admins.length === 0) return 0

  let sent = 0
  const adminUrl = `${getAdminModulesUrl()}?source=youtube&status=draft`
  const preview = importedVideos.slice(0, 8).map((item) => ({
    moduleId: item.moduleId,
    title: item.title,
  }))

  for (const admin of admins) {
    const result = await sendEmail({
      to: admin.email,
      type: "youtube_sync_summary",
      data: {
        userName: admin.full_name || admin.email,
        importedCount: importedVideos.length,
        importedVideos: preview,
        channelId,
        adminUrl,
      },
    })

    if (result.success) {
      sent += 1
    }
  }

  return sent
}

async function sendFailureEmails(errorMessage: string, channelId: string): Promise<number> {
  const admins = await listAdminRecipients()
  if (admins.length === 0) return 0

  let sent = 0
  const adminUrl = `${getAdminModulesUrl()}?source=youtube`
  for (const admin of admins) {
    const result = await sendEmail({
      to: admin.email,
      type: "youtube_sync_failure",
      data: {
        userName: admin.full_name || admin.email,
        errorMessage,
        channelId,
        adminUrl,
      },
    })

    if (result.success) {
      sent += 1
    }
  }

  return sent
}

async function collectRecentCandidates(
  channel: YoutubeResolvedChannel,
  config: YoutubeSyncConfig,
  previousState: YoutubeSyncStateRow | null,
  accessToken: string,
): Promise<{ candidates: Map<string, YoutubeUploadCandidate>; maxPublishedAt: string | null }> {
  const collected = new Map<string, YoutubeUploadCandidate>()
  let pageToken: string | undefined
  let maxPublishedAt: string | null = previousState?.last_seen_video_published_at || null

  const cutoffDate = previousState?.last_seen_video_published_at
    ? new Date(new Date(previousState.last_seen_video_published_at).getTime() - (config.lookbackHours * 60 * 60 * 1000))
    : null

  do {
    const page = await listYoutubeUploadPage(channel.uploadsPlaylistId, pageToken, accessToken)
    const pageItems = page.items || []
    const videoIds = [...new Set(
      pageItems
        .map((item) => item.contentDetails?.videoId || item.snippet?.resourceId?.videoId)
        .filter(Boolean) as string[],
    )]

    const videos = await getYoutubeVideos(videoIds, accessToken)
    const normalizedById = new Map(videos.map((video) => {
      const normalized = normalizeYoutubeVideo(video)
      return [normalized.videoId, normalized] as const
    }))

    let oldestPublishedAtOnPage: string | null = null
    for (const item of pageItems) {
      const videoId = item.contentDetails?.videoId || item.snippet?.resourceId?.videoId
      const publishedAt = item.contentDetails?.videoPublishedAt || item.snippet?.publishedAt || null

      if (publishedAt && (!oldestPublishedAtOnPage || publishedAt < oldestPublishedAtOnPage)) {
        oldestPublishedAtOnPage = publishedAt
      }
      if (publishedAt && (!maxPublishedAt || publishedAt > maxPublishedAt)) {
        maxPublishedAt = publishedAt
      }

      if (!videoId) continue
      const normalized = normalizedById.get(videoId)
      if (normalized) {
        collected.set(videoId, normalized)
      }
    }

    pageToken = page.nextPageToken || undefined
    if (!pageToken) break
    if (cutoffDate && oldestPublishedAtOnPage && new Date(oldestPublishedAtOnPage) < cutoffDate) {
      break
    }
  } while (pageToken)

  return { candidates: collected, maxPublishedAt }
}

async function hydrateExistingYoutubeVideos(
  existingModules: LearningModuleRow[],
  accessToken: string,
  recentCandidates: Map<string, YoutubeUploadCandidate>,
): Promise<Map<string, YoutubeUploadCandidate>> {
  const existingVideoIds = existingModules
    .map((module) => module.source_video_id)
    .filter(Boolean) as string[]

  const missingVideoIds = existingVideoIds.filter((videoId) => !recentCandidates.has(videoId))
  if (missingVideoIds.length === 0) {
    return recentCandidates
  }

  const hydrated = new Map(recentCandidates)
  for (let index = 0; index < missingVideoIds.length; index += 50) {
    const batch = missingVideoIds.slice(index, index + 50)
    const videos = await getYoutubeVideos(batch, accessToken)
    for (const video of videos) {
      const normalized = normalizeYoutubeVideo(video)
      hydrated.set(normalized.videoId, normalized)
    }
  }

  return hydrated
}

function buildExistingModuleUpdate(
  existing: LearningModuleRow,
  candidate: YoutubeUploadCandidate | null,
  channel: YoutubeResolvedChannel,
  nowIso: string,
): LearningModuleUpdate {
  if (!candidate || candidate.channelId !== channel.channelId) {
    return {
      source_status: "removed",
      source_visibility: "unknown",
      source_synced_at: nowIso,
      source_payload: null,
    }
  }

  const active = isEligibleVideo(candidate, channel)
  return {
    title: candidate.title,
    description: candidate.description || null,
    module_type: "VIDEO",
    duration_mins: candidate.durationMins,
    content_embed_url: candidate.embedUrl,
    open_url: candidate.watchUrl,
    thumbnail_url: candidate.thumbnailUrl,
    owner: candidate.channelTitle || existing.owner,
    source: "youtube",
    source_video_id: candidate.videoId,
    source_channel_id: channel.channelId,
    source_visibility: candidate.privacyStatus,
    source_status: active ? "active" : "removed",
    source_published_at: candidate.publishedAt,
    source_synced_at: nowIso,
    source_payload: sanitizeSourcePayload(candidate),
  }
}

function hasExistingModuleChanged(existing: LearningModuleRow, update: LearningModuleUpdate): boolean {
  return (
    existing.title !== update.title ||
    existing.description !== (update.description ?? null) ||
    existing.duration_mins !== update.duration_mins ||
    existing.content_embed_url !== update.content_embed_url ||
    existing.open_url !== (update.open_url ?? null) ||
    existing.thumbnail_url !== (update.thumbnail_url ?? null) ||
    existing.owner !== update.owner ||
    existing.source_status !== update.source_status ||
    existing.source_visibility !== update.source_visibility ||
    existing.source_channel_id !== (update.source_channel_id ?? null) ||
    existing.source_video_id !== (update.source_video_id ?? null) ||
    existing.source_published_at !== (update.source_published_at ?? null)
  )
}

export async function getYoutubeSyncStatus(): Promise<YoutubeSyncStatusPayload> {
  const config = getYoutubeSyncConfig()
  const configured = isYoutubeSyncConfigured(config)
  const channelId = config.channelId

  let state: YoutubeSyncStateRow | null = null
  let pendingReviewCount = 0

  if (channelId) {
    try {
      state = await loadSyncState(channelId)
    } catch (error) {
      console.error("Failed to load YouTube sync state:", error)
    }
  }

  if (configured && channelId) {
    try {
      const supabase = await createAdminClient()
      const { count } = await supabase
        .from("learning_modules")
        .select("*", { count: "exact", head: true })
        .eq("source", "youtube")
        .is("source_reviewed_at", null)
      pendingReviewCount = count || 0
    } catch (error) {
      console.error("Failed to count pending YouTube imports:", error)
    }
  }

  return {
    enabled: config.enabled,
    configured,
    channelId,
    lookbackHours: config.lookbackHours,
    pendingReviewCount,
    state: state
      ? {
          lastCheckedAt: state.last_checked_at,
          lastSuccessAt: state.last_success_at,
          lastSeenVideoPublishedAt: state.last_seen_video_published_at,
          lastError: state.last_error,
          lastErrorFingerprint: state.last_error_fingerprint,
          uploadsPlaylistId: state.uploads_playlist_id === UNKNOWN_UPLOADS_PLAYLIST_ID ? null : state.uploads_playlist_id,
        }
      : null,
  }
}

export async function runYoutubeSync(trigger: SyncTrigger): Promise<YoutubeSyncResult> {
  const config = getYoutubeSyncConfig()
  const configured = isYoutubeSyncConfigured(config)
  const stats: YoutubeSyncRunStats = {
    scanned: 0,
    imported: 0,
    updated: 0,
    markedRemoved: 0,
    skippedIneligible: 0,
    failed: 0,
    notifiedAdmins: 0,
  }

  if (!config.enabled || !configured || !config.channelId) {
    const state = config.channelId ? await loadSyncState(config.channelId).catch(() => null) : null
    return {
      success: true,
      enabled: config.enabled,
      configured,
      skipped: !config.enabled ? "youtube_sync_disabled" : "youtube_sync_not_configured",
      trigger,
      channelId: config.channelId,
      channelTitle: null,
      stats,
      importedVideos: [],
      state: state
        ? {
            lastCheckedAt: state.last_checked_at,
            lastSuccessAt: state.last_success_at,
            lastSeenVideoPublishedAt: state.last_seen_video_published_at,
            lastError: state.last_error,
            lastErrorFingerprint: state.last_error_fingerprint,
            uploadsPlaylistId: state.uploads_playlist_id === UNKNOWN_UPLOADS_PLAYLIST_ID ? null : state.uploads_playlist_id,
          }
        : null,
    }
  }

  const nowIso = new Date().toISOString()
  const previousState = await loadSyncState(config.channelId).catch(() => null)

  try {
    const accessToken = await getYoutubeAccessToken(config)
    const channel = await resolveYoutubeChannel(config, accessToken)
    const supabase = await createAdminClient()

    const { data: existingModules, error: existingError } = await supabase
      .from("learning_modules")
      .select("*")
      .eq("source", "youtube")

    if (existingError) throw existingError

    const existingByVideoId = new Map(
      ((existingModules || []) as LearningModuleRow[])
        .filter((module) => module.source_video_id)
        .map((module) => [module.source_video_id as string, module]),
    )

    const { candidates: recentCandidates, maxPublishedAt } = await collectRecentCandidates(
      channel,
      config,
      previousState,
      accessToken,
    )

    const hydratedCandidates = await hydrateExistingYoutubeVideos(
      (existingModules || []) as LearningModuleRow[],
      accessToken,
      recentCandidates,
    )

    stats.scanned = hydratedCandidates.size
    const importedVideos: Array<{ moduleId: string; title: string; videoId: string }> = []

    const { data: maxSortRow, error: maxSortError } = await supabase
      .from("learning_modules")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)

    if (maxSortError) throw maxSortError
    let nextSortOrder = ((maxSortRow || [])[0]?.sort_order || 0) + 10

    for (const existing of (existingModules || []) as LearningModuleRow[]) {
      const videoId = existing.source_video_id
      if (!videoId) continue

      const candidate = hydratedCandidates.get(videoId) || null
      const updatePayload = buildExistingModuleUpdate(existing, candidate, channel, nowIso)
      if (!hasExistingModuleChanged(existing, updatePayload)) {
        continue
      }

      const { error } = await supabase
        .from("learning_modules")
        .update(updatePayload)
        .eq("module_id", existing.module_id)

      if (error) {
        stats.failed += 1
        continue
      }

      if (updatePayload.source_status === "removed") {
        stats.markedRemoved += 1
      } else {
        stats.updated += 1
      }
    }

    for (const candidate of hydratedCandidates.values()) {
      if (!isEligibleVideo(candidate, channel)) {
        if (!existingByVideoId.has(candidate.videoId)) {
          stats.skippedIneligible += 1
        }
        continue
      }

      if (existingByVideoId.has(candidate.videoId)) {
        continue
      }

      const insertPayload: LearningModuleInsert = {
        module_id: createModuleId(candidate.videoId),
        title: candidate.title,
        objective: OBJECTIVE_PLACEHOLDER,
        description: candidate.description || null,
        module_type: "VIDEO",
        duration_mins: candidate.durationMins,
        content_embed_url: candidate.embedUrl,
        open_url: candidate.watchUrl,
        thumbnail_url: candidate.thumbnailUrl,
        owner: candidate.channelTitle || channel.channelTitle,
        badges: [],
        teams: [],
        status: "draft",
        quiz_mode: "none",
        quiz_embed_url: null,
        quiz_url: null,
        sort_order: nextSortOrder,
        source: "youtube",
        source_video_id: candidate.videoId,
        source_channel_id: channel.channelId,
        source_visibility: candidate.privacyStatus,
        source_status: "active",
        source_published_at: candidate.publishedAt,
        source_imported_at: nowIso,
        source_synced_at: nowIso,
        source_reviewed_at: null,
        source_payload: sanitizeSourcePayload(candidate),
      }

      const { error } = await supabase
        .from("learning_modules")
        .insert(insertPayload)

      if (error) {
        stats.failed += 1
        continue
      }

      importedVideos.push({
        moduleId: insertPayload.module_id,
        title: insertPayload.title,
        videoId: candidate.videoId,
      })
      stats.imported += 1
      nextSortOrder += 10
    }

    await writeSyncState({
      channel_id: channel.channelId,
      uploads_playlist_id: channel.uploadsPlaylistId,
      last_checked_at: nowIso,
      last_success_at: nowIso,
      last_seen_video_published_at: maxPublishedAt || previousState?.last_seen_video_published_at || null,
      last_error: null,
      last_error_fingerprint: null,
    })

    if (importedVideos.length > 0) {
      stats.notifiedAdmins = await sendImportSummaryEmails(importedVideos, channel.channelId)
    }

    const latestState = await loadSyncState(channel.channelId)
    return {
      success: true,
      enabled: config.enabled,
      configured,
      trigger,
      channelId: channel.channelId,
      channelTitle: channel.channelTitle,
      stats,
      importedVideos,
      state: latestState
        ? {
            lastCheckedAt: latestState.last_checked_at,
            lastSuccessAt: latestState.last_success_at,
            lastSeenVideoPublishedAt: latestState.last_seen_video_published_at,
            lastError: latestState.last_error,
            lastErrorFingerprint: latestState.last_error_fingerprint,
            uploadsPlaylistId: latestState.uploads_playlist_id === UNKNOWN_UPLOADS_PLAYLIST_ID ? null : latestState.uploads_playlist_id,
          }
        : null,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown YouTube sync error"
    const fingerprint = createErrorFingerprint(message)
    const uploadsPlaylistId = previousState?.uploads_playlist_id || UNKNOWN_UPLOADS_PLAYLIST_ID
    const shouldNotify = previousState?.last_error_fingerprint !== fingerprint

    await writeSyncState({
      channel_id: config.channelId,
      uploads_playlist_id: uploadsPlaylistId,
      last_checked_at: nowIso,
      last_error: message,
      last_error_fingerprint: fingerprint,
      last_success_at: previousState?.last_success_at || null,
      last_seen_video_published_at: previousState?.last_seen_video_published_at || null,
    }).catch((stateError) => {
      console.error("Failed to persist YouTube sync error state:", stateError)
    })

    if (shouldNotify) {
      stats.notifiedAdmins = await sendFailureEmails(message, config.channelId).catch((notifyError) => {
        console.error("Failed to notify admins about YouTube sync failure:", notifyError)
        return 0
      })
    }

    const latestState = await loadSyncState(config.channelId).catch(() => previousState)
    return {
      success: false,
      enabled: config.enabled,
      configured,
      trigger,
      channelId: config.channelId,
      channelTitle: null,
      stats,
      importedVideos: [],
      state: latestState
        ? {
            lastCheckedAt: latestState.last_checked_at,
            lastSuccessAt: latestState.last_success_at,
            lastSeenVideoPublishedAt: latestState.last_seen_video_published_at,
            lastError: latestState.last_error,
            lastErrorFingerprint: latestState.last_error_fingerprint,
            uploadsPlaylistId: latestState.uploads_playlist_id === UNKNOWN_UPLOADS_PLAYLIST_ID ? null : latestState.uploads_playlist_id,
          }
        : null,
    }
  }
}
