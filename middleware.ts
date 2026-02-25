import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  
  const cookieName = process.env.AUTH_COOKIE_NAME || "lh_session";
  const hasLegacySession = Boolean(req.cookies.get(cookieName)?.value);
  
  let hasSupabaseSession = false;
  let supabaseResponse: NextResponse | null = null;
  
  try {
    const result = await updateSession(req);
    hasSupabaseSession = Boolean(result.user);
    supabaseResponse = result.supabaseResponse;
  } catch {
    // Supabase not configured yet, continue with legacy auth
  }
  
  const hasSession = hasLegacySession || hasSupabaseSession;

  if (pathname.startsWith("/hub") && !hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/admin") && !hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  if (pathname === "/" && hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/hub";
    return NextResponse.redirect(url);
  }

  return supabaseResponse || NextResponse.next();
}

export const config = {
  matcher: ["/", "/hub/:path*", "/admin/:path*"],
};
