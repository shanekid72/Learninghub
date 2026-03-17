import { NextResponse } from "next/server"
import { requireAdminProfile } from "@/lib/admin-auth"
import {
  adminModuleSchema,
  buildModuleMetrics,
  mapModuleRowToAdminModule,
  matchesModuleSearch,
  type LearningModuleRow,
} from "@/lib/learning-modules"
import { createAdminClient } from "@/lib/supabase/server"

type QuizSummaryRow = {
  id: string
  module_id: string
}

async function ensureLearningTeamsExist(teamNames: string[]) {
  if (teamNames.length === 0) return

  const supabase = await createAdminClient()
  const uniqueNames = [...new Set(teamNames.map((team) => team.trim()).filter(Boolean))]
  if (uniqueNames.length === 0) return

  const { data: existing, error: existingError } = await supabase
    .from("learning_teams")
    .select("name")
    .in("name", uniqueNames)

  if (existingError) throw existingError

  const existingNames = new Set((existing || []).map((team) => team.name))
  const missingNames = uniqueNames.filter((team) => !existingNames.has(team))
  if (missingNames.length === 0) return

  const { data: lastTeam, error: lastTeamError } = await supabase
    .from("learning_teams")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)

  if (lastTeamError) throw lastTeamError

  const baseSort = (lastTeam || [])[0]?.sort_order || 0
  const rows = missingNames.map((name, index) => ({
    name,
    is_active: true,
    sort_order: baseSort + ((index + 1) * 10),
  }))

  const { error } = await supabase.from("learning_teams").insert(rows)
  if (error && error.code !== "23505") throw error
}

async function loadModuleMetrics(moduleIds: string[]) {
  if (moduleIds.length === 0) {
    return new Map()
  }

  const supabase = await createAdminClient()

  const [
    { data: assignments, error: assignmentsError },
    { data: analyticsEvents, error: analyticsError },
    { data: quizzes, error: quizzesError },
  ] = await Promise.all([
    supabase
      .from("module_assignments")
      .select("module_id")
      .eq("module_source", "lh")
      .eq("is_active", true)
      .in("module_id", moduleIds),
    supabase
      .from("analytics_events")
      .select("module_id, event_type")
      .in("module_id", moduleIds)
      .in("event_type", ["module_view", "module_complete"]),
    supabase
      .from("quizzes")
      .select("id, module_id")
      .in("module_id", moduleIds),
  ])

  if (assignmentsError) throw assignmentsError
  if (analyticsError) throw analyticsError
  if (quizzesError) throw quizzesError

  const quizRows = (quizzes || []) as QuizSummaryRow[]
  const quizIds = quizRows.map((quiz) => quiz.id)

  const { data: quizAttempts, error: quizAttemptsError } = quizIds.length
    ? await supabase
        .from("quiz_attempts")
        .select("quiz_id, score")
        .in("quiz_id", quizIds)
    : { data: [], error: null }

  if (quizAttemptsError) throw quizAttemptsError

  const quizToModule = new Map(quizRows.map((quiz) => [quiz.id, quiz.module_id]))
  const moduleAttempts = (quizAttempts || []).map((attempt) => ({
    score: attempt.score,
    module_id: quizToModule.get(attempt.quiz_id) || null,
  }))

  const modules = moduleIds.map((moduleId) => ({
    module_id: moduleId,
  })) as LearningModuleRow[]

  return buildModuleMetrics(
    modules,
    (assignments || []).map((row) => ({ ...row, module_id: row.module_id })),
    (analyticsEvents || []).map((row) => ({ ...row, module_id: row.module_id, event_type: row.event_type })),
    moduleAttempts,
  )
}

export async function GET(request: Request) {
  const admin = await requireAdminProfile()
  if (admin.error) return admin.error

  try {
    const supabase = await createAdminClient()
    const { searchParams } = new URL(request.url)

    const search = searchParams.get("search") || ""
    const status = searchParams.get("status")
    const moduleType = searchParams.get("type")
    const badge = searchParams.get("badge")
    const team = searchParams.get("team")
    const source = searchParams.get("source")
    const sourceVisibility = searchParams.get("visibility")
    const syncStatus = searchParams.get("syncStatus")
    const compact = searchParams.get("compact") === "1"

    let query = supabase
      .from("learning_modules")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("updated_at", { ascending: false })

    if (status && status !== "all") {
      query = query.eq("status", status)
    }

    if (moduleType && moduleType !== "all") {
      query = query.eq("module_type", moduleType)
    }

    if (badge && badge !== "all") {
      query = query.contains("badges", [badge])
    }

    if (team && team !== "all") {
      query = query.contains("teams", [team])
    }

    if (source && source !== "all") {
      query = query.eq("source", source)
    }

    if (sourceVisibility && sourceVisibility !== "all") {
      query = query.eq("source_visibility", sourceVisibility)
    }

    if (syncStatus && syncStatus !== "all") {
      query = query.eq("source_status", syncStatus)
    }

    const { data, error } = await query
    if (error) throw error

    const filteredModules = ((data || []) as LearningModuleRow[]).filter((module) =>
      matchesModuleSearch(module, search),
    )

    if (compact) {
      const modules = filteredModules.map((module) => mapModuleRowToAdminModule(module))
      return NextResponse.json({ modules })
    }

    const metrics = await loadModuleMetrics(filteredModules.map((module) => module.module_id))
    const modules = filteredModules.map((module) =>
      mapModuleRowToAdminModule(module, metrics.get(module.module_id)),
    )

    return NextResponse.json({ modules })
  } catch (error) {
    console.error("Error fetching learning modules:", error)
    return NextResponse.json({ error: "Failed to fetch modules" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const admin = await requireAdminProfile()
  if (admin.error) return admin.error

  try {
    const payload = await request.json()
    const parsed = adminModuleSchema.safeParse(payload)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid module payload", details: parsed.error.issues },
        { status: 400 },
      )
    }

    await ensureLearningTeamsExist(parsed.data.teams)
    const supabase = await createAdminClient()

    const insertPayload = {
      module_id: parsed.data.moduleId,
      title: parsed.data.title,
      objective: parsed.data.objective,
      description: parsed.data.description,
      module_type: parsed.data.moduleType,
      duration_mins: parsed.data.durationMins,
      content_embed_url: parsed.data.contentEmbedUrl,
      open_url: parsed.data.openUrl,
      thumbnail_url: parsed.data.thumbnailUrl,
      owner: parsed.data.owner,
      badges: parsed.data.badges,
      teams: parsed.data.teams,
      status: parsed.data.status,
      sort_order: parsed.data.sortOrder,
      quiz_mode: parsed.data.quizMode,
      quiz_embed_url: parsed.data.quizEmbedUrl,
      quiz_url: parsed.data.quizUrl,
      created_by: admin.profile.id,
      updated_by: admin.profile.id,
    }

    const { data: module, error } = await supabase
      .from("learning_modules")
      .insert(insertPayload)
      .select("*")
      .single()

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "Module ID already exists" }, { status: 409 })
      }
      throw error
    }

    if (parsed.data.quizMode === "internal" && parsed.data.quiz) {
      const { error: quizError } = await supabase
        .from("quizzes")
        .upsert(
          {
            module_id: parsed.data.moduleId,
            title: parsed.data.quiz.title,
            passing_score: parsed.data.quiz.passingScore,
            questions: parsed.data.quiz.questions,
            created_by: admin.profile.id,
          },
          { onConflict: "module_id" },
        )

      if (quizError) throw quizError
    }

    return NextResponse.json({ module: mapModuleRowToAdminModule(module as LearningModuleRow) }, { status: 201 })
  } catch (error) {
    console.error("Error creating learning module:", error)
    return NextResponse.json({ error: "Failed to create module" }, { status: 500 })
  }
}
