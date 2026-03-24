import { NextResponse } from "next/server"
import { isHrIntegrityEnabled } from "@/lib/hr/feature"
import { hrHeartbeatSchema } from "@/lib/hr/schemas"
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
    const parsed = hrHeartbeatSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid heartbeat payload", details: parsed.error.issues },
        { status: 400 },
      )
    }

    const supabase = await createAdminClient()
    const result = await recordHrSummaryEvent({
      authToken,
      envelope: parsed.data.envelope,
      eventType: parsed.data.envelope.eventType,
      signature: parsed.data.signature,
      supabase,
    })

    if (!result.ok) {
      if (result.error === "invalid_token") {
        return NextResponse.json({ error: "Unauthorized or expired HR upload token" }, { status: 401 })
      }

      if (result.error === "invalid_payload") {
        return NextResponse.json({ error: "Invalid signed HR payload" }, { status: 400 })
      }

      if (result.error === "invalid_signature") {
        return NextResponse.json({ error: "HR upload signature verification failed" }, { status: 403 })
      }

      return NextResponse.json({ error: "This HR session no longer accepts uploads" }, { status: 409 })
    }

    return NextResponse.json({ acceptedSequence: result.acceptedSequence })
  } catch (error) {
    console.error("Error recording HR heartbeat:", error)
    return NextResponse.json({ error: "Failed to record HR heartbeat" }, { status: 500 })
  }
}
