import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import {
  buildRootRedirect,
  getAllowedAuthDomains,
  getAuthCallbackUrl,
} from "@/lib/auth-config"
import {
  attachRateLimitCookie,
  checkRateLimit,
  createRateLimitCookieValue,
  getRateLimitCookieName,
  getRateLimitResponse,
} from "@/lib/rate-limit"

export async function GET(request: NextRequest) {
  let rateLimitId = request.cookies.get(getRateLimitCookieName())?.value
  let shouldSetRateLimitCookie = false

  if (!rateLimitId) {
    rateLimitId = createRateLimitCookieValue()
    shouldSetRateLimitCookie = true
  }

  const rateLimitResult = checkRateLimit(rateLimitId, "/api/auth/login")
  if (!rateLimitResult.success) {
    const response = getRateLimitResponse(rateLimitResult.resetIn)
    if (shouldSetRateLimitCookie) {
      attachRateLimitCookie(response, rateLimitId)
    }
    return response
  }

  const allowedDomains = getAllowedAuthDomains()
  if (allowedDomains.length === 0) {
    const response = buildRootRedirect(request.nextUrl.origin, "auth_domain_not_configured")
    if (shouldSetRateLimitCookie) {
      attachRateLimitCookie(response, rateLimitId)
    }
    return response
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: getAuthCallbackUrl(request.nextUrl.origin),
      queryParams:
        allowedDomains.length === 1
          ? {
              hd: allowedDomains[0],
              prompt: "select_account",
            }
          : {
              prompt: "select_account",
            },
    },
  })

  if (error || !data.url) {
    const response = buildRootRedirect(request.nextUrl.origin, "auth_oauth_start_failed")
    if (shouldSetRateLimitCookie) {
      attachRateLimitCookie(response, rateLimitId)
    }
    return response
  }

  const response = NextResponse.redirect(data.url)
  if (shouldSetRateLimitCookie) {
    attachRateLimitCookie(response, rateLimitId)
  }
  return response
}

export async function POST() {
  return NextResponse.json(
    { ok: false, error: "email_login_removed" },
    { status: 410 },
  )
}
