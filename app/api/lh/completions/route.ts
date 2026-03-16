import { NextResponse } from "next/server"
import { getSessionContext } from "@/lib/app-session"
import { createAdminClient } from "@/lib/supabase/server"

export const runtime = "nodejs"

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null
  const clean = value.trim().toLowerCase()
  return clean && clean.includes("@") ? clean : null
}

export async function GET() {
  const session = await getSessionContext()
  if (!session) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 })
  }

  try {
    const supabase = await createAdminClient()
    const { data, error } = await supabase
      .from("analytics_events")
      .select("module_id, created_at, metadata, user_id")
      .eq("event_type", "module_complete")
      .order("created_at", { ascending: false })
      .limit(5000)

    if (error) throw error

    const latestByModule = new Map<
      string,
      { email: string; module_id: string; completed_at: string; source: string }
    >()

    for (const row of data || []) {
      const moduleId = row.module_id ? String(row.module_id) : ""
      const completedAt = row.created_at || new Date().toISOString()
      if (!moduleId) continue

      const metadata =
        row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
          ? (row.metadata as Record<string, unknown>)
          : null

      const eventEmail = normalizeEmail(metadata?.email)
      const matchesProfile = Boolean(session.profile?.id && row.user_id === session.profile.id)
      const matchesEmail = eventEmail === session.email

      if (!matchesProfile && !matchesEmail) continue

      const existing = latestByModule.get(moduleId)
      if (existing && existing.completed_at >= completedAt) continue

      latestByModule.set(moduleId, {
        email: session.email,
        module_id: moduleId,
        completed_at: completedAt,
        source: typeof metadata?.source === "string" ? metadata.source : "portal",
      })
    }

    return NextResponse.json({
      ok: true,
      completions: [...latestByModule.values()].sort((a, b) =>
        b.completed_at.localeCompare(a.completed_at),
      ),
    })
  } catch (error) {
    console.error("Error fetching completions:", error)
    return NextResponse.json({ ok: false, error: "failed_to_fetch_completions" }, { status: 500 })
  }
}
