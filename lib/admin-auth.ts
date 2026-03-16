import { NextResponse } from "next/server"
import { getSessionContext, hasAdminRole, type SessionUserProfile } from "@/lib/app-session"

export async function requireAdminProfile():
  Promise<{ profile: SessionUserProfile; error?: never } | { profile?: never; error: NextResponse }> {
  const session = await getSessionContext()
  if (!session?.profile) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }

  if (!hasAdminRole(session.profile)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  }

  return { profile: session.profile }
}
