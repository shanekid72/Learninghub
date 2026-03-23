import { NextResponse } from "next/server"
import { isHrIntegrityEnabled } from "@/lib/hr/feature"
import { getHrInviteValidation } from "@/lib/hr/server"
import { createAdminClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  if (!isHrIntegrityEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const url = new URL(request.url)
  const token = url.searchParams.get("token")?.trim()

  if (!token) {
    return NextResponse.json({ error: "token is required" }, { status: 400 })
  }

  try {
    const supabase = await createAdminClient()
    const result = await getHrInviteValidation(supabase, token)
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error validating HR invite:", error)
    return NextResponse.json({ error: "Failed to validate invite" }, { status: 500 })
  }
}
