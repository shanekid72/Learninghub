import { NextResponse } from "next/server"
import { z } from "zod"
import { getSessionContext } from "@/lib/app-session"
import { createAdminClient } from "@/lib/supabase/server"
import { recordAnalyticsEvent } from "@/lib/server-analytics"

const clientAnalyticsEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("module_view"),
    moduleId: z.string().trim().min(1).max(200),
  }),
  z.object({
    type: z.literal("quiz_start"),
    moduleId: z.string().trim().min(1).max(200),
    quizId: z.string().trim().min(1).max(200),
  }),
  z.object({
    type: z.literal("search"),
    query: z.string().trim().min(1).max(200),
    resultsCount: z.number().int().min(0).max(10000),
  }),
])

export async function POST(request: Request) {
  const session = await getSessionContext()
  if (!session?.profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request data" }, { status: 400 })
  }

  const parsed = clientAnalyticsEventSchema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request data", details: parsed.error.issues },
      { status: 400 },
    )
  }

  const supabase = await createAdminClient()
  const metadata =
    parsed.data.type === "quiz_start"
      ? { quizId: parsed.data.quizId }
      : parsed.data.type === "search"
        ? { query: parsed.data.query, resultsCount: parsed.data.resultsCount }
        : null

  const success = await recordAnalyticsEvent(
    {
      userId: session.profile.id,
      type: parsed.data.type,
      moduleId: "moduleId" in parsed.data ? parsed.data.moduleId : null,
      metadata,
    },
    supabase,
  )

  if (!success) {
    return NextResponse.json({ error: "Failed to record analytics event" }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
