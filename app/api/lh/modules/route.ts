import { NextResponse } from "next/server"
import { getSessionContext } from "@/lib/app-session"
import { mapModuleRowToLearnerModule, type LearningModuleRow } from "@/lib/learning-modules"
import { buildModuleAssignmentMap, type AssignmentRecord } from "@/lib/module-assignments"
import { createAdminClient } from "@/lib/supabase/server"

export const runtime = "nodejs"

export async function GET() {
  const session = await getSessionContext()
  if (!session) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 })
  }

  try {
    const supabase = await createAdminClient()

    const [
      { data: modules, error: modulesError },
      { data: teams, error: teamsError },
    ] = await Promise.all([
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

    const assignmentMap = new Map<string, { assigned: true; dueDate?: string }>()

    if (session.profile) {
      const { data: userAssignments, error: userAssignmentsError } = await supabase
        .from("module_assignments")
        .select("module_id, due_date")
        .eq("module_source", "lh")
        .eq("is_active", true)
        .eq("user_id", session.profile.id)

      if (userAssignmentsError) throw userAssignmentsError

      let teamAssignments: AssignmentRecord[] = []
      if (session.profile.team) {
        const { data, error } = await supabase
          .from("module_assignments")
          .select("module_id, due_date")
          .eq("module_source", "lh")
          .eq("is_active", true)
          .eq("team", session.profile.team)

        if (error) throw error
        teamAssignments = data || []
      }

      const mergedAssignments = buildModuleAssignmentMap([
        ...((userAssignments || []) as AssignmentRecord[]),
        ...teamAssignments,
      ])

      for (const [moduleId, meta] of mergedAssignments.entries()) {
        assignmentMap.set(moduleId, meta)
      }
    }

    return NextResponse.json({
      ok: true,
      teams: (teams || []).map((team) => team.name),
      modules: ((modules || []) as LearningModuleRow[]).map((module) =>
        mapModuleRowToLearnerModule(module, assignmentMap.get(module.module_id)),
      ),
    })
  } catch (error) {
    console.error("Error fetching learner modules:", error)
    return NextResponse.json({ ok: false, error: "failed_to_fetch_modules" }, { status: 500 })
  }
}
