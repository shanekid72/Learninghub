import { normalizeEmail } from "@/lib/auth-config"
import { createClient } from "@/lib/supabase/server"
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
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    throw userError
  }

  if (!user) {
    return null
  }

  const normalizedUserEmail = normalizeEmail(user.email)
  if (!normalizedUserEmail) {
    return null
  }

  const { data: ownProfile, error: ownProfileError } = await supabase
    .from("profiles")
    .select("id, email, role, full_name, team")
    .eq("id", user.id)
    .maybeSingle()

  if (ownProfileError && ownProfileError.code !== "PGRST116") {
    throw ownProfileError
  }

  if (ownProfile) {
    return {
      email: normalizeEmail(ownProfile.email) || normalizedUserEmail,
      profile: {
        id: ownProfile.id,
        email: ownProfile.email,
        role: ownProfile.role || "learner",
        fullName: ownProfile.full_name,
        team: ownProfile.team,
      },
    }
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      email: normalizedUserEmail,
      profile: {
        id: user.id,
        email: normalizedUserEmail,
        role: "learner",
        fullName: null,
        team: null,
      },
    }
  }

  const adminClient = await createAdminClient()
  const { data: adminProfile, error: adminProfileError } = await adminClient
    .from("profiles")
    .select("id, email, role, full_name, team")
    .eq("id", user.id)
    .maybeSingle()

  if (adminProfileError && adminProfileError.code !== "PGRST116") {
    throw adminProfileError
  }

  return {
    email: normalizeEmail(adminProfile?.email) || normalizedUserEmail,
    profile: adminProfile
      ? {
          id: adminProfile.id,
          email: adminProfile.email,
          role: adminProfile.role || "learner",
          fullName: adminProfile.full_name,
          team: adminProfile.team,
        }
      : {
          id: user.id,
          email: normalizedUserEmail,
          role: "learner",
          fullName: null,
          team: null,
        },
  }
}
