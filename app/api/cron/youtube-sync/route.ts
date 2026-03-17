import { NextResponse } from "next/server"
import { runYoutubeSync } from "@/lib/youtube-sync"

function getBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null
  const value = authHeader.trim()
  if (!value.toLowerCase().startsWith("bearer ")) return null
  return value.slice(7).trim() || null
}

function isAuthorized(request: Request, cronSecret: string): boolean {
  const url = new URL(request.url)
  return (
    request.headers.get("x-cron-secret") === cronSecret ||
    getBearerToken(request.headers.get("authorization")) === cronSecret ||
    url.searchParams.get("secret") === cronSecret
  )
}

async function handleCron(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 500 })
  }

  if (!isAuthorized(request, cronSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const result = await runYoutubeSync("cron")
  return NextResponse.json(result, { status: result.success ? 200 : 500 })
}

export async function GET(request: Request) {
  return handleCron(request)
}
