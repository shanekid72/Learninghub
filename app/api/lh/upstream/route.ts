import { NextResponse } from "next/server"
import { mapModuleRowToLearnerModule, type LearningModuleRow } from "@/lib/learning-modules"
import { createAdminClient } from "@/lib/supabase/server"
import type { Database } from "@/lib/supabase/database.types"

export const runtime = "nodejs"

type CompletionInsert = Database["public"]["Tables"]["analytics_events"]["Insert"]

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null
  const clean = value.trim().toLowerCase()
  if (!clean || !clean.includes("@")) return null
  return clean
}

function normalizeAction(rawAction: string | null): string {
  return (rawAction || "").trim().toLowerCase()
}

function ensureApiKey(url: URL): NextResponse | null {
  const serverKey = process.env.LH_API_KEY
  const providedKey = url.searchParams.get("key")

  if (!serverKey) {
    return NextResponse.json(
      { ok: false, error: "server_missing_lh_api_key" },
      { status: 500 },
    )
  }

  if (!providedKey || providedKey !== serverKey) {
    return NextResponse.json({ ok: false, error: "invalid_key" }, { status: 401 })
  }

  return null
}

async function handleModules() {
  const supabase = await createAdminClient()
  const [{ data: modules, error: modulesError }, { data: teams, error: teamsError }] = await Promise.all([
    supabase
      .from("learning_modules")
      .select("*")
      .eq("status", "published")
      .order("sort_order", { ascending: true })
      .order("updated_at", { ascending: false }),
    supabase
      .from("learning_teams")
      .select("name")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
  ])

  if (modulesError) throw modulesError
  if (teamsError) throw teamsError

  return NextResponse.json({
    ok: true,
    teams: (teams || []).map((team) => team.name),
    modules: ((modules || []) as LearningModuleRow[]).map((module) =>
      mapModuleRowToLearnerModule(module),
    ),
  })
}

async function handleCompletions(url: URL) {
  const email = normalizeEmail(url.searchParams.get("email"))
  if (!email) {
    return NextResponse.json(
      { ok: false, error: "missing_email" },
      { status: 400 },
    )
  }

  const supabase = await createAdminClient()
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle()

  if (profileError) {
    console.error("Fallback completions profile lookup failed:", profileError)
    return NextResponse.json(
      { ok: false, error: "db_query_failed" },
      { status: 500 },
    )
  }

  if (!profile) {
    return NextResponse.json({
      ok: true,
      completions: [],
    })
  }

  const { data, error } = await supabase
    .from("analytics_events")
    .select("module_id, created_at, metadata")
    .eq("event_type", "module_complete")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Fallback completions query failed:", error)
    return NextResponse.json(
      { ok: false, error: "db_query_failed" },
      { status: 500 },
    )
  }

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

    const existing = latestByModule.get(moduleId)
    if (existing && existing.completed_at >= completedAt) continue

    latestByModule.set(moduleId, {
      email,
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
}

async function handleMarkComplete(request: Request) {
  let payload: Record<string, unknown> = {}
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_payload" },
      { status: 400 },
    )
  }

  const email = normalizeEmail(payload.email)
  const moduleId = String(payload.module_id || payload.moduleId || "").trim()
  const source = typeof payload.source === "string" ? payload.source : "portal"

  if (!email || !moduleId) {
    return NextResponse.json(
      { ok: false, error: "missing_email_or_module_id" },
      { status: 400 },
    )
  }

  const supabase = await createAdminClient()
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle()

  const insertRow: CompletionInsert = {
    user_id: profile?.id || null,
    event_type: "module_complete",
    module_id: moduleId,
    metadata: {
      email,
      source,
      via: "lh-upstream-compat",
    },
  }

  const { error } = await supabase.from("analytics_events").insert(insertRow)
  if (error) {
    console.error("Fallback markComplete insert failed:", error)
    return NextResponse.json(
      { ok: false, error: "db_insert_failed" },
      { status: 500 },
    )
  }

  return NextResponse.json({
    ok: true,
    completion: {
      email,
      module_id: moduleId,
      completed_at: new Date().toISOString(),
      source,
    },
  })
}

async function handleAction(request: Request) {
  const url = new URL(request.url)
  const keyError = ensureApiKey(url)
  if (keyError) return keyError

  const action = normalizeAction(url.searchParams.get("action"))

  if (action === "modules") {
    return handleModules()
  }

  if (action === "completions") {
    return handleCompletions(url)
  }

  if (action === "markcomplete") {
    if (request.method !== "POST") {
      return NextResponse.json(
        { ok: false, error: "method_not_allowed" },
        { status: 405 },
      )
    }
    return handleMarkComplete(request)
  }

  return NextResponse.json(
    { ok: false, error: "unknown_action" },
    { status: 400 },
  )
}

export async function GET(request: Request) {
  return handleAction(request)
}

export async function POST(request: Request) {
  return handleAction(request)
}
