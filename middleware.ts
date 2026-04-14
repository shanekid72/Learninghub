import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const { user, supabaseResponse } = await updateSession(req)
  const hasSession = Boolean(user)

  if (pathname.startsWith("/hub") && !hasSession) {
    const url = req.nextUrl.clone()
    url.pathname = "/"
    const response = NextResponse.redirect(url)
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      response.cookies.set(cookie)
    })
    return response
  }

  if (pathname.startsWith("/admin") && !hasSession) {
    const url = req.nextUrl.clone()
    url.pathname = "/"
    const response = NextResponse.redirect(url)
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      response.cookies.set(cookie)
    })
    return response
  }

  if (pathname === "/" && hasSession) {
    const url = req.nextUrl.clone()
    url.pathname = "/hub"
    const response = NextResponse.redirect(url)
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      response.cookies.set(cookie)
    })
    return response
  }

  return supabaseResponse
}

export const config = {
  matcher: ["/", "/hub/:path*", "/admin/:path*"],
}
