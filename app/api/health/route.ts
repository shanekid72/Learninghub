import { NextResponse } from "next/server"

function boolEnv(name: string): boolean {
  return Boolean(process.env[name])
}

export async function GET() {
  const smtpConfigured = boolEnv("SMTP_USER") && boolEnv("SMTP_APP_PASSWORD")
  const resendConfigured = boolEnv("RESEND_API_KEY")
  const supabaseConfigured = boolEnv("NEXT_PUBLIC_SUPABASE_URL") && boolEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
  const supabaseAdminConfigured = boolEnv("SUPABASE_SERVICE_ROLE_KEY")
  const youtubeSyncEnabled = ["1", "true", "yes", "on"].includes((process.env.YOUTUBE_SYNC_ENABLED || "").trim().toLowerCase())
  const youtubeOAuthConfigured =
    boolEnv("YOUTUBE_CHANNEL_ID") &&
    boolEnv("YOUTUBE_CLIENT_ID") &&
    boolEnv("YOUTUBE_CLIENT_SECRET") &&
    boolEnv("YOUTUBE_REFRESH_TOKEN")
  const openaiQuizConfigured = boolEnv("OPENAI_API_KEY")

  const payload = {
    ok: true,
    service: "learninghub",
    timestamp: new Date().toISOString(),
    checks: {
      supabaseUrl: boolEnv("NEXT_PUBLIC_SUPABASE_URL"),
      supabaseAnonKey: boolEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
      supabaseServiceRoleKey: supabaseAdminConfigured,
      moduleCatalogConfigured: supabaseConfigured && supabaseAdminConfigured,
      authCookieSecret: boolEnv("AUTH_COOKIE_SECRET"),
      lhFallbackConfigured: boolEnv("LH_BASE_URL") && boolEnv("LH_API_KEY"),
      smtpConfigured,
      resendConfigured,
      emailConfigured: smtpConfigured || resendConfigured,
      youtubeSyncEnabled,
      youtubeChannelId: boolEnv("YOUTUBE_CHANNEL_ID"),
      youtubeOAuthConfigured,
      openaiQuizConfigured,
    },
  }

  return NextResponse.json(payload, { status: 200 })
}
