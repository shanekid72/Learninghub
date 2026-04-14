import { NextResponse } from "next/server"
import { clearLegacyAuthCookie } from "@/lib/auth-config"
import { createClient } from "@/lib/supabase/server"

export async function POST() {
  const supabase = await createClient()
  await supabase.auth.signOut()

  const response = NextResponse.json({ ok: true })
  clearLegacyAuthCookie(response)
  return response
}
