import { NextResponse } from "next/server"
import { z } from "zod"
import { getSessionContext, hasAdminRole } from "@/lib/app-session"
import { createAdminClient } from "@/lib/supabase/server"

const datePattern = /^\d{4}-\d{2}-\d{2}$/

const updateAssignmentSchema = z
  .object({
    dueDate: z.union([z.string().regex(datePattern), z.null()]).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((payload) => payload.dueDate !== undefined || payload.isActive !== undefined, {
    message: "At least one field must be provided",
  })

async function requireAdmin() {
  const session = await getSessionContext()
  if (!session?.profile) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }
  if (!hasAdminRole(session.profile)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  }
  return { profile: session.profile }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin()
  if (admin.error) return admin.error

  try {
    const { id } = await params
    const payload = await request.json()
    const parsed = updateAssignmentSchema.safeParse(payload)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid assignment update payload", details: parsed.error.issues },
        { status: 400 },
      )
    }

    const updates: Record<string, unknown> = {}
    if (parsed.data.dueDate !== undefined) {
      updates.due_date = parsed.data.dueDate
    }
    if (parsed.data.isActive !== undefined) {
      updates.is_active = parsed.data.isActive
    }

    const supabase = await createAdminClient()
    const { data, error } = await supabase
      .from("module_assignments")
      .update(updates)
      .eq("id", id)
      .select("id, module_source, module_id, user_id, team, due_date, is_active, created_by, created_at")
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error updating assignment:", error)
    return NextResponse.json({ error: "Failed to update assignment" }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin()
  if (admin.error) return admin.error

  try {
    const { id } = await params
    const supabase = await createAdminClient()
    const { error } = await supabase
      .from("module_assignments")
      .update({ is_active: false })
      .eq("id", id)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error disabling assignment:", error)
    return NextResponse.json({ error: "Failed to disable assignment" }, { status: 500 })
  }
}
