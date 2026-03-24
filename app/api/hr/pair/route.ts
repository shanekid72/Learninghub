import { NextResponse } from "next/server"
import { isHrIntegrityEnabled } from "@/lib/hr/feature"
import { pairHrSessionSchema } from "@/lib/hr/schemas"
import { pairHrSession } from "@/lib/hr/server"
import { createAdminClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  if (!isHrIntegrityEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  try {
    const body = await request.json()
    const parsed = pairHrSessionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid pair payload", details: parsed.error.issues },
        { status: 400 },
      )
    }

    const supabase = await createAdminClient()
    const result = await pairHrSession(supabase, parsed.data)

    if ("error" in result) {
      if (result.error === "invalid") {
        return NextResponse.json({ error: "Invalid invite token" }, { status: 400 })
      }
      if (result.error === "not_found") {
        return NextResponse.json({ error: "HR session not found" }, { status: 404 })
      }

      return NextResponse.json({ error: "This session can no longer be paired" }, { status: 409 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error pairing HR session:", error)
    return NextResponse.json({ error: "Failed to pair HR session" }, { status: 500 })
  }
}
