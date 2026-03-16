import { NextResponse } from "next/server"
import { requireAdminProfile } from "@/lib/admin-auth"
import {
  adminModuleUpdateSchema,
  buildModuleMetrics,
  defaultModuleMetrics,
  mapModuleRowToAdminModule,
  mapQuizRowToInternalQuiz,
  type LearningModuleRow,
  type QuizRow,
} from "@/lib/learning-modules"
import { createAdminClient } from "@/lib/supabase/server"

type RouteParams = { params: Promise<{ moduleId: string }> }

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

async function loadModuleDetail(moduleId: string) {
  const supabase = await createAdminClient()
  const [
    { data: module, error: moduleError },
    { data: quiz, error: quizError },
    { data: assignments, error: assignmentsError },
    { data: analyticsEvents, error: analyticsError },
  ] = await Promise.all([
    supabase.from("learning_modules").select("*").eq("module_id", moduleId).maybeSingle(),
    supabase.from("quizzes").select("*").eq("module_id", moduleId).maybeSingle(),
    supabase
      .from("module_assignments")
      .select("module_id")
      .eq("module_source", "lh")
      .eq("is_active", true)
      .eq("module_id", moduleId),
    supabase
      .from("analytics_events")
      .select("module_id, event_type")
      .eq("module_id", moduleId)
      .in("event_type", ["module_view", "module_complete"]),
  ])

  if (moduleError) throw moduleError
  if (quizError && quizError.code !== "PGRST116") throw quizError
  if (assignmentsError) throw assignmentsError
  if (analyticsError) throw analyticsError

  if (!module) return null

  const quizRow = (quiz || null) as QuizRow | null
  const metrics = buildModuleMetrics(
    [module as LearningModuleRow],
    (assignments || []).map((row) => ({ ...row, module_id: row.module_id })),
    (analyticsEvents || []).map((row) => ({ ...row, module_id: row.module_id, event_type: row.event_type })),
    [],
  )

  return {
    module: mapModuleRowToAdminModule(module as LearningModuleRow, metrics.get(moduleId) || defaultModuleMetrics()),
    quiz: mapQuizRowToInternalQuiz(quizRow),
    hasStoredInternalQuiz: Boolean(quizRow),
  }
}

export async function GET(_request: Request, { params }: RouteParams) {
  const admin = await requireAdminProfile()
  if (admin.error) return admin.error

  try {
    const { moduleId } = await params
    const detail = await loadModuleDetail(moduleId)
    if (!detail) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 })
    }

    return NextResponse.json(detail)
  } catch (error) {
    console.error("Error fetching module detail:", error)
    return NextResponse.json({ error: "Failed to fetch module" }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const admin = await requireAdminProfile()
  if (admin.error) return admin.error

  try {
    const { moduleId } = await params
    const payload = await request.json()
    const parsed = adminModuleUpdateSchema.safeParse(payload)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid module payload", details: parsed.error.issues },
        { status: 400 },
      )
    }

    await ensureLearningTeamsExist(parsed.data.teams)
    const supabase = await createAdminClient()

    const { data: module, error } = await supabase
      .from("learning_modules")
      .update({
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
        updated_by: admin.profile.id,
      })
      .eq("module_id", moduleId)
      .select("*")
      .maybeSingle()

    if (error) throw error
    if (!module) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 })
    }

    if (parsed.data.quizMode === "internal" && parsed.data.quiz) {
      const { error: quizError } = await supabase
        .from("quizzes")
        .upsert(
          {
            module_id: moduleId,
            title: parsed.data.quiz.title,
            passing_score: parsed.data.quiz.passingScore,
            questions: parsed.data.quiz.questions,
            created_by: admin.profile.id,
          },
          { onConflict: "module_id" },
        )

      if (quizError) throw quizError
    } else if (parsed.data.removeInternalQuiz) {
      const { error: deleteQuizError } = await supabase
        .from("quizzes")
        .delete()
        .eq("module_id", moduleId)

      if (deleteQuizError) throw deleteQuizError
    }

    const detail = await loadModuleDetail(moduleId)
    return NextResponse.json(detail)
  } catch (error) {
    console.error("Error updating learning module:", error)
    return NextResponse.json({ error: "Failed to update module" }, { status: 500 })
  }
}
