import { cookies } from "next/headers"
import { getAuthCookieName, readEmailFromSession } from "@/lib/auth-session"
import { createAdminClient } from "@/lib/supabase/server"

export type SessionUserProfile = {
  id: string
  email: string
  role: string
  fullName: string | null
  team: string | null
}

export type SessionContext = {
  email: string
  profile: SessionUserProfile | null
}

export function hasAdminRole(profile: SessionUserProfile | null | undefined): boolean {
  return profile?.role === "admin"
}

export async function getSessionContext(): Promise<SessionContext | null> {
  const cookieStore = await cookies()
  const sessionEmail = await readEmailFromSession(
    cookieStore.get(getAuthCookieName())?.value,
  )

  if (!sessionEmail) {
    return null
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { email: sessionEmail, profile: null }
  }

  const supabase = await createAdminClient()
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, email, role, full_name, team")
    .eq("email", sessionEmail)
    .maybeSingle()

  if (error) {
    throw error
  }

  return {
    email: sessionEmail,
    profile: profile
      ? {
          id: profile.id,
          email: profile.email,
          role: profile.role,
          fullName: profile.full_name,
          team: profile.team,
        }
      : null,
  }
}
