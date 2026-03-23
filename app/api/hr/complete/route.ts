import { NextResponse } from "next/server"
import { isHrIntegrityEnabled } from "@/lib/hr/feature"
import { hrCompleteSchema } from "@/lib/hr/schemas"
import { getBearerToken, recordHrSummaryEvent } from "@/lib/hr/server"
import { createAdminClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  if (!isHrIntegrityEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const authToken = getBearerToken(request)
  if (!authToken) {
    return NextResponse.json({ error: "Missing bearer token" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const parsed = hrCompleteSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid completion payload", details: parsed.error.issues },
        { status: 400 },
      )
    }

    const supabase = await createAdminClient()
    const session = await recordHrSummaryEvent({
      authToken,
      eventType: "completed",
      summary: parsed.data.summary,
      supabase,
    })

    if (!session) {
      return NextResponse.json({ error: "Unauthorized or expired HR upload token" }, { status: 401 })
    }

    return NextResponse.json({ session })
  } catch (error) {
    console.error("Error completing HR session:", error)
    return NextResponse.json({ error: "Failed to complete HR session" }, { status: 500 })
  }
}
