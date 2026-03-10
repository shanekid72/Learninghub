import { NextResponse } from "next/server"
import { z } from "zod"
import { getSessionContext, hasAdminRole } from "@/lib/app-session"
import { createAdminClient } from "@/lib/supabase/server"

const datePattern = /^\d{4}-\d{2}-\d{2}$/

const createAssignmentSchema = z.object({
  moduleId: z.string().min(1).max(200),
  moduleSource: z.enum(["lh"]).default("lh"),
  targetType: z.enum(["user", "team"]),
  userId: z.string().uuid().optional(),
  team: z.string().min(1).max(120).optional(),
  dueDate: z.string().regex(datePattern).optional(),
  isActive: z.boolean().optional(),
})

type AssignmentRow = {
  id: string
  module_source: string
  module_id: string
  user_id: string | null
  team: string | null
  due_date: string | null
  is_active: boolean
  created_by: string | null
  created_at: string
}

async function requireAdminContext() {
  const session = await getSessionContext()
  if (!session?.profile) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }
  if (!hasAdminRole(session.profile)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  }
  return { profile: session.profile }
}

async function enrichAssignments(assignments: AssignmentRow[], includeUsers = false) {
  const supabase = await createAdminClient()
  const userIds = [...new Set(assignments.map((assignment) => assignment.user_id).filter(Boolean) as string[])]
  const usersById = new Map<string, { id: string; email: string; full_name: string | null; team: string | null }>()

  if (userIds.length > 0) {
    const { data: users, error } = await supabase
      .from("profiles")
      .select("id, email, full_name, team")
      .in("id", userIds)

    if (error) {
      throw error
    }

    for (const user of users || []) {
      usersById.set(user.id, user)
    }
  }

  const enrichedAssignments = assignments.map((assignment) => ({
    ...assignment,
    targetType: assignment.user_id ? "user" : "team",
    user: assignment.user_id ? usersById.get(assignment.user_id) || null : null,
  }))

  if (!includeUsers) {
    return { assignments: enrichedAssignments }
  }

  const { data: users, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, team")
    .order("email", { ascending: true })

  if (error) {
    throw error
  }

  return { assignments: enrichedAssignments, users: users || [] }
}

export async function GET(request: Request) {
  const admin = await requireAdminContext()
  if (admin.error) return admin.error

  try {
    const supabase = await createAdminClient()
    const { searchParams } = new URL(request.url)
    const moduleId = searchParams.get("moduleId")
    const includeUsers = searchParams.get("includeUsers") === "1"
    const activeParam = searchParams.get("active")

    let query = supabase
      .from("module_assignments")
      .select("id, module_source, module_id, user_id, team, due_date, is_active, created_by, created_at")
      .order("created_at", { ascending: false })

    if (moduleId) {
      query = query.eq("module_id", moduleId)
    }

    if (activeParam === "true" || activeParam === "false") {
      query = query.eq("is_active", activeParam === "true")
    }

    const { data, error } = await query
    if (error) {
      throw error
    }

    const payload = await enrichAssignments((data || []) as AssignmentRow[], includeUsers)
    return NextResponse.json(payload)
  } catch (error) {
    console.error("Error fetching assignments:", error)
    return NextResponse.json({ error: "Failed to fetch assignments" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const admin = await requireAdminContext()
  if (admin.error) return admin.error

  try {
    const payload = await request.json()
    const parsed = createAssignmentSchema.safeParse(payload)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid assignment payload", details: parsed.error.issues },
        { status: 400 },
      )
    }

    const assignment = parsed.data
    if (assignment.targetType === "user" && !assignment.userId) {
      return NextResponse.json({ error: "userId is required for user assignments" }, { status: 400 })
    }
    if (assignment.targetType === "team" && !assignment.team) {
      return NextResponse.json({ error: "team is required for team assignments" }, { status: 400 })
    }

    const supabase = await createAdminClient()
    const insertPayload = {
      module_source: assignment.moduleSource,
      module_id: assignment.moduleId,
      user_id: assignment.targetType === "user" ? assignment.userId || null : null,
      team: assignment.targetType === "team" ? assignment.team || null : null,
      due_date: assignment.dueDate || null,
      is_active: assignment.isActive ?? true,
      created_by: admin.profile.id,
    }

    const { data, error } = await supabase
      .from("module_assignments")
      .insert(insertPayload)
      .select("id, module_source, module_id, user_id, team, due_date, is_active, created_by, created_at")
      .single()

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "An active assignment already exists for this target and module" },
          { status: 409 },
        )
      }
      throw error
    }

    const enriched = await enrichAssignments([data as AssignmentRow])
    return NextResponse.json(enriched.assignments[0], { status: 201 })
  } catch (error) {
    console.error("Error creating assignment:", error)
    return NextResponse.json({ error: "Failed to create assignment" }, { status: 500 })
  }
}
