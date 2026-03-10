import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAuthCookieName, readEmailFromSession } from "@/lib/auth-session";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  
  const cookieName = getAuthCookieName();
  const hasSession = Boolean(
    await readEmailFromSession(req.cookies.get(cookieName)?.value),
  );

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

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/hub/:path*", "/admin/:path*"],
};
