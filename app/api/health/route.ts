import { NextResponse } from "next/server"

function boolEnv(name: string): boolean {
  return Boolean(process.env[name])
}

export async function GET() {
  const smtpConfigured = boolEnv("SMTP_USER") && boolEnv("SMTP_APP_PASSWORD")
  const resendConfigured = boolEnv("RESEND_API_KEY")

  const payload = {
    ok: true,
    service: "learninghub",
    timestamp: new Date().toISOString(),
    checks: {
      supabaseUrl: boolEnv("NEXT_PUBLIC_SUPABASE_URL"),
      supabaseAnonKey: boolEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
      authCookieSecret: boolEnv("AUTH_COOKIE_SECRET"),
      lhApiConfigured: boolEnv("LH_BASE_URL") && boolEnv("LH_API_KEY"),
      smtpConfigured,
      resendConfigured,
      emailConfigured: smtpConfigured || resendConfigured,
    },
  }

  return NextResponse.json(payload, { status: 200 })
}
