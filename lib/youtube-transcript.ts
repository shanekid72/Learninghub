const WATCH_BASE = "https://www.youtube.com/watch"

type CaptionTrack = {
  baseUrl?: string
  languageCode?: string
  kind?: string
  name?: {
    simpleText?: string
  }
  isTranslatable?: boolean
}

export type YoutubeTranscriptResult = {
  transcript: string | null
  source: "youtube_captions" | "none"
  languageCode: string | null
  warning: string | null
}

function extractJsonObject(source: string, token: string): Record<string, unknown> | null {
  const tokenIndex = source.indexOf(token)
  if (tokenIndex === -1) return null

  const start = source.indexOf("{", tokenIndex)
  if (start === -1) return null

  let depth = 0
  let inString = false
  let escaped = false

  for (let index = start; index < source.length; index += 1) {
    const char = source[index]

    if (inString) {
      if (escaped) {
        escaped = false
        continue
      }
      if (char === "\\") {
        escaped = true
        continue
      }
      if (char === '"') {
        inString = false
      }
      continue
    }

    if (char === '"') {
      inString = true
      continue
    }

    if (char === "{") {
      depth += 1
      continue
    }

    if (char === "}") {
      depth -= 1
      if (depth === 0) {
        const candidate = source.slice(start, index + 1)
        try {
          return JSON.parse(candidate) as Record<string, unknown>
        } catch {
          return null
        }
      }
    }
  }

  return null
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&#10;/g, "\n")
    .replace(/&#(\d+);/g, (_match, code) => String.fromCharCode(Number(code)))
}

function normalizeTranscriptText(chunks: string[]): string | null {
  const cleaned = chunks
    .map((chunk) => decodeHtmlEntities(chunk).replace(/\s+/g, " ").trim())
    .filter(Boolean)

  if (cleaned.length === 0) return null

  const deduped: string[] = []
  for (const chunk of cleaned) {
    if (deduped[deduped.length - 1] !== chunk) {
      deduped.push(chunk)
    }
  }

  const transcript = deduped.join(" ").replace(/\s+/g, " ").trim()
  return transcript || null
}

function parseJson3Transcript(body: string): string | null {
  try {
    const payload = JSON.parse(body) as {
      events?: Array<{
        segs?: Array<{ utf8?: string }>
      }>
    }

    const chunks = (payload.events || []).flatMap((event) =>
      (event.segs || []).map((segment) => segment.utf8 || ""),
    )

    return normalizeTranscriptText(chunks)
  } catch {
    return null
  }
}

function parseXmlTranscript(body: string): string | null {
  const chunks = [...body.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)].map((match) => match[1])
  return normalizeTranscriptText(chunks)
}

function parseVttTranscript(body: string): string | null {
  const chunks = body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) =>
      line &&
      line !== "WEBVTT" &&
      !/^NOTE\b/.test(line) &&
      !/^\d+$/.test(line) &&
      !/^\d{2}:\d{2}:\d{2}\.\d{3}\s+-->/.test(line) &&
      !/^\d{2}:\d{2}\.\d{3}\s+-->/.test(line),
    )

  return normalizeTranscriptText(chunks)
}

async function fetchCaptionText(baseUrl: string): Promise<string | null> {
  const attempts = [
    `${baseUrl}&fmt=json3`,
    `${baseUrl}&fmt=vtt`,
    baseUrl,
  ]

  for (const url of attempts) {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
      cache: "no-store",
    }).catch(() => null)

    if (!response?.ok) continue
    const body = await response.text()
    if (!body.trim()) continue

    if (url.includes("fmt=json3") || body.trim().startsWith("{")) {
      const transcript = parseJson3Transcript(body)
      if (transcript) return transcript
    }

    if (url.includes("fmt=vtt") || body.startsWith("WEBVTT")) {
      const transcript = parseVttTranscript(body)
      if (transcript) return transcript
    }

    const transcript = parseXmlTranscript(body)
    if (transcript) return transcript
  }

  return null
}

function chooseCaptionTrack(tracks: CaptionTrack[]): CaptionTrack | null {
  if (tracks.length === 0) return null

  const preferred = [
    (track: CaptionTrack) => !track.kind && /^en(-|$)/i.test(track.languageCode || ""),
    (track: CaptionTrack) => /^en(-|$)/i.test(track.languageCode || ""),
    (track: CaptionTrack) => !track.kind,
    (_track: CaptionTrack) => true,
  ]

  for (const matcher of preferred) {
    const found = tracks.find(matcher)
    if (found?.baseUrl) return found
  }

  return tracks.find((track) => Boolean(track.baseUrl)) || null
}

function extractCaptionTracks(html: string): CaptionTrack[] {
  const playerResponse =
    extractJsonObject(html, "var ytInitialPlayerResponse =") ||
    extractJsonObject(html, "ytInitialPlayerResponse =") ||
    extractJsonObject(html, '"captions":')

  const captions = playerResponse?.captions as
    | {
        playerCaptionsTracklistRenderer?: {
          captionTracks?: CaptionTrack[]
        }
      }
    | undefined

  return captions?.playerCaptionsTracklistRenderer?.captionTracks || []
}

function buildWatchUrl(videoId: string): string {
  const url = new URL(WATCH_BASE)
  url.searchParams.set("v", videoId)
  url.searchParams.set("hl", "en")
  return url.toString()
}

export function normalizeYoutubeVideoId(value: string): string | null {
  const clean = value.trim()
  if (!clean) return null

  if (/^[A-Za-z0-9_-]{11}$/.test(clean)) {
    return clean
  }

  try {
    const url = new URL(clean)
    if (url.hostname.includes("youtu.be")) {
      const segment = url.pathname.split("/").filter(Boolean)[0]
      return /^[A-Za-z0-9_-]{11}$/.test(segment || "") ? segment : null
    }

    if (url.hostname.includes("youtube.com")) {
      const fromQuery = url.searchParams.get("v")
      if (fromQuery && /^[A-Za-z0-9_-]{11}$/.test(fromQuery)) {
        return fromQuery
      }

      const parts = url.pathname.split("/").filter(Boolean)
      const embedId = parts[1]
      if ((parts[0] === "embed" || parts[0] === "shorts") && /^[A-Za-z0-9_-]{11}$/.test(embedId || "")) {
        return embedId
      }
    }
  } catch {
    return null
  }

  return null
}

export async function fetchYoutubeTranscript(videoIdOrUrl: string): Promise<YoutubeTranscriptResult> {
  const videoId = normalizeYoutubeVideoId(videoIdOrUrl)
  if (!videoId) {
    return {
      transcript: null,
      source: "none",
      languageCode: null,
      warning: "No valid YouTube video ID was found.",
    }
  }

  const watchResponse = await fetch(buildWatchUrl(videoId), {
    headers: {
      "User-Agent": "Mozilla/5.0",
      "Accept-Language": "en-US,en;q=0.9",
    },
    cache: "no-store",
  }).catch(() => null)

  if (!watchResponse?.ok) {
    return {
      transcript: null,
      source: "none",
      languageCode: null,
      warning: "The YouTube watch page could not be loaded for transcript extraction.",
    }
  }

  const html = await watchResponse.text()
  const captionTracks = extractCaptionTracks(html)
  const chosenTrack = chooseCaptionTrack(captionTracks)
  if (!chosenTrack?.baseUrl) {
    return {
      transcript: null,
      source: "none",
      languageCode: null,
      warning: "No accessible YouTube captions were found for this video.",
    }
  }

  const transcript = await fetchCaptionText(chosenTrack.baseUrl)
  if (!transcript) {
    return {
      transcript: null,
      source: "none",
      languageCode: chosenTrack.languageCode || null,
      warning: "A caption track exists, but the transcript could not be extracted.",
    }
  }

  return {
    transcript,
    source: "youtube_captions",
    languageCode: chosenTrack.languageCode || null,
    warning: null,
  }
}

export const __internal = {
  decodeHtmlEntities,
  extractCaptionTracks,
  normalizeTranscriptText,
  parseJson3Transcript,
  parseVttTranscript,
  parseXmlTranscript,
}
