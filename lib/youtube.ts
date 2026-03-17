const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3"
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"

export type YoutubeSyncConfig = {
  enabled: boolean
  channelId: string | null
  clientId: string | null
  clientSecret: string | null
  refreshToken: string | null
  lookbackHours: number
}

type YoutubeTokenResponse = {
  access_token: string
  expires_in: number
  scope?: string
  token_type: string
}

type YoutubeThumbnail = {
  url: string
  width?: number
  height?: number
}

type YoutubeApiResponse<T> = {
  items?: T[]
  nextPageToken?: string
}

type YoutubeChannelItem = {
  id: string
  snippet?: {
    title?: string
  }
  contentDetails?: {
    relatedPlaylists?: {
      uploads?: string
    }
  }
}

type YoutubePlaylistItem = {
  snippet?: {
    publishedAt?: string
    title?: string
    description?: string
    channelId?: string
    channelTitle?: string
    resourceId?: {
      videoId?: string
    }
    thumbnails?: Record<string, YoutubeThumbnail>
  }
  contentDetails?: {
    videoId?: string
    videoPublishedAt?: string
  }
  status?: {
    privacyStatus?: string
  }
}

type YoutubeVideoItem = {
  id: string
  snippet?: {
    publishedAt?: string
    title?: string
    description?: string
    channelId?: string
    channelTitle?: string
    thumbnails?: Record<string, YoutubeThumbnail>
  }
  contentDetails?: {
    duration?: string
  }
  status?: {
    privacyStatus?: string
    embeddable?: boolean
    uploadStatus?: string
  }
}

export type YoutubeResolvedChannel = {
  channelId: string
  channelTitle: string
  uploadsPlaylistId: string
}

export type YoutubeUploadCandidate = {
  videoId: string
  title: string
  description: string
  channelId: string
  channelTitle: string
  publishedAt: string | null
  durationMins: number
  privacyStatus: string
  embeddable: boolean
  uploadStatus: string | null
  embedUrl: string
  watchUrl: string
  thumbnailUrl: string | null
  raw: YoutubeVideoItem
}

export function getYoutubeSyncConfig(): YoutubeSyncConfig {
  const lookbackRaw = Number(process.env.YOUTUBE_SYNC_LOOKBACK_HOURS || "168")
  const lookbackHours = Number.isFinite(lookbackRaw)
    ? Math.max(1, Math.min(Math.round(lookbackRaw), 24 * 90))
    : 168

  return {
    enabled: ["1", "true", "yes", "on"].includes((process.env.YOUTUBE_SYNC_ENABLED || "").trim().toLowerCase()),
    channelId: process.env.YOUTUBE_CHANNEL_ID?.trim() || null,
    clientId: process.env.YOUTUBE_CLIENT_ID?.trim() || null,
    clientSecret: process.env.YOUTUBE_CLIENT_SECRET?.trim() || null,
    refreshToken: process.env.YOUTUBE_REFRESH_TOKEN?.trim() || null,
    lookbackHours,
  }
}

export function isYoutubeSyncConfigured(config = getYoutubeSyncConfig()): boolean {
  return Boolean(config.channelId && config.clientId && config.clientSecret && config.refreshToken)
}

export async function getYoutubeAccessToken(config: YoutubeSyncConfig): Promise<string> {
  if (!config.clientId || !config.clientSecret || !config.refreshToken) {
    throw new Error("YouTube OAuth environment variables are not fully configured")
  }

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: config.refreshToken,
      grant_type: "refresh_token",
    }),
  })

  const payload = (await response.json().catch(() => ({}))) as Partial<YoutubeTokenResponse> & {
    error?: string
    error_description?: string
  }

  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error_description || payload.error || "Failed to refresh YouTube OAuth token")
  }

  return payload.access_token
}

async function youtubeApi<T>(
  path: string,
  params: Record<string, string | number | undefined>,
  accessToken: string,
): Promise<T> {
  const searchParams = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue
    searchParams.set(key, String(value))
  }

  const response = await fetch(`${YOUTUBE_API_BASE}${path}?${searchParams.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  const payload = (await response.json().catch(() => ({}))) as T & {
    error?: { message?: string }
  }

  if (!response.ok) {
    throw new Error(payload?.error?.message || `YouTube API request failed for ${path}`)
  }

  return payload
}

export function parseYoutubeDurationToMinutes(value: string | null | undefined): number {
  if (!value) return 0
  const match = value.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/)
  if (!match) return 0

  const hours = Number(match[1] || "0")
  const minutes = Number(match[2] || "0")
  const seconds = Number(match[3] || "0")
  const totalMinutes = (hours * 60) + minutes + (seconds > 0 ? 1 : 0)
  return totalMinutes
}

function getBestThumbnail(thumbnails: Record<string, YoutubeThumbnail> | undefined): string | null {
  if (!thumbnails) return null
  const preferredOrder = ["maxres", "standard", "high", "medium", "default"]
  for (const key of preferredOrder) {
    const candidate = thumbnails[key]
    if (candidate?.url) return candidate.url
  }
  const fallback = Object.values(thumbnails).find((thumbnail) => Boolean(thumbnail?.url))
  return fallback?.url || null
}

export async function resolveYoutubeChannel(
  config = getYoutubeSyncConfig(),
  accessToken?: string,
): Promise<YoutubeResolvedChannel> {
  if (!config.channelId) {
    throw new Error("YOUTUBE_CHANNEL_ID is not configured")
  }

  const resolvedAccessToken = accessToken || (await getYoutubeAccessToken(config))
  const response = await youtubeApi<YoutubeApiResponse<YoutubeChannelItem>>(
    "/channels",
    {
      part: "snippet,contentDetails",
      id: config.channelId,
      maxResults: 1,
    },
    resolvedAccessToken,
  )

  const channel = response.items?.[0]
  const uploadsPlaylistId = channel?.contentDetails?.relatedPlaylists?.uploads
  if (!channel?.id || !uploadsPlaylistId) {
    throw new Error("Could not resolve uploads playlist for the configured YouTube channel")
  }

  return {
    channelId: channel.id,
    channelTitle: channel.snippet?.title || channel.id,
    uploadsPlaylistId,
  }
}

export async function listYoutubeUploadPage(
  uploadsPlaylistId: string,
  pageToken: string | undefined,
  accessToken: string,
): Promise<YoutubeApiResponse<YoutubePlaylistItem>> {
  return youtubeApi<YoutubeApiResponse<YoutubePlaylistItem>>(
    "/playlistItems",
    {
      part: "snippet,contentDetails,status",
      playlistId: uploadsPlaylistId,
      maxResults: 50,
      pageToken,
    },
    accessToken,
  )
}

export async function getYoutubeVideos(
  videoIds: string[],
  accessToken: string,
): Promise<YoutubeVideoItem[]> {
  if (videoIds.length === 0) return []
  const response = await youtubeApi<YoutubeApiResponse<YoutubeVideoItem>>(
    "/videos",
    {
      part: "snippet,contentDetails,status",
      id: videoIds.join(","),
      maxResults: 50,
    },
    accessToken,
  )

  return response.items || []
}

export function normalizeYoutubeVideo(video: YoutubeVideoItem): YoutubeUploadCandidate {
  const snippet = video.snippet || {}
  const status = video.status || {}
  return {
    videoId: video.id,
    title: snippet.title || video.id,
    description: snippet.description || "",
    channelId: snippet.channelId || "",
    channelTitle: snippet.channelTitle || snippet.channelId || "YouTube",
    publishedAt: snippet.publishedAt || null,
    durationMins: parseYoutubeDurationToMinutes(video.contentDetails?.duration),
    privacyStatus: status.privacyStatus || "unknown",
    embeddable: status.embeddable !== false,
    uploadStatus: status.uploadStatus || null,
    embedUrl: `https://www.youtube.com/embed/${video.id}`,
    watchUrl: `https://www.youtube.com/watch?v=${video.id}`,
    thumbnailUrl: getBestThumbnail(snippet.thumbnails),
    raw: video,
  }
}
