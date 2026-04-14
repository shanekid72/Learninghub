import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import {
  buildRootRedirect,
  clearLegacyAuthCookie,
  getAllowedAuthDomains,
  isAllowedAuthEmail,
} from "@/lib/auth-config"
import { createClient } from "@/lib/supabase/server"

function buildCallbackErrorRedirect(origin: string, errorCode: string) {
  const response = buildRootRedirect(origin, errorCode)
  clearLegacyAuthCookie(response)
  return response
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const providerError = requestUrl.searchParams.get("error")
  if (providerError) {
    return buildCallbackErrorRedirect(requestUrl.origin, `oauth_${providerError}`)
  }

  const code = requestUrl.searchParams.get("code")
  if (!code) {
    return buildCallbackErrorRedirect(requestUrl.origin, "auth_missing_code")
  }

  const supabase = await createClient()
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
  if (exchangeError) {
    return buildCallbackErrorRedirect(requestUrl.origin, "auth_exchange_failed")
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user?.email) {
    await supabase.auth.signOut()
    return buildCallbackErrorRedirect(requestUrl.origin, "auth_session_missing")
  }

  if (getAllowedAuthDomains().length === 0) {
    await supabase.auth.signOut()
    return buildCallbackErrorRedirect(requestUrl.origin, "auth_domain_not_configured")
  }

  if (!isAllowedAuthEmail(user.email)) {
    await supabase.auth.signOut()
    return buildCallbackErrorRedirect(requestUrl.origin, "auth_domain_not_allowed")
  }

  const response = NextResponse.redirect(new URL("/hub", requestUrl.origin))
  clearLegacyAuthCookie(response)
  return response
}
