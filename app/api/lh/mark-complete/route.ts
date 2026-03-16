import { NextResponse } from "next/server"
import { z } from "zod"
import { getSessionContext } from "@/lib/app-session"
import { createAdminClient } from "@/lib/supabase/server"

export const runtime = "nodejs"

const markCompleteSchema = z.object({
  moduleId: z.string().trim().min(1).optional(),
  module_id: z.string().trim().min(1).optional(),
  source: z.string().trim().min(1).max(80).optional(),
})

export async function POST(req: Request) {
  const session = await getSessionContext()
  if (!session) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const parsed = markCompleteSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "invalid_payload", details: parsed.error.issues },
        { status: 400 },
      )
    }

    const moduleId = parsed.data.moduleId || parsed.data.module_id
    if (!moduleId) {
      return NextResponse.json({ ok: false, error: "missing_module_id" }, { status: 400 })
    }

    const supabase = await createAdminClient()
    const { error } = await supabase.from("analytics_events").insert({
      user_id: session.profile?.id || null,
      event_type: "module_complete",
      module_id: moduleId,
      metadata: {
        email: session.email,
        source: parsed.data.source || "portal",
        via: "portal",
      },
    })

    if (error) throw error

    return NextResponse.json({
      ok: true,
      completion: {
        email: session.email,
        module_id: moduleId,
        completed_at: new Date().toISOString(),
        source: parsed.data.source || "portal",
      },
    })
  } catch (error) {
    console.error("Error marking module complete:", error)
    return NextResponse.json({ ok: false, error: "failed_to_mark_complete" }, { status: 500 })
  }
}
