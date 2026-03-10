import { NextResponse } from "next/server"
import { z } from "zod"
import { getSessionContext, hasAdminRole } from "@/lib/app-session"
import { createAdminClient } from "@/lib/supabase/server"
import { isEmailProviderConfigured, sendEmail } from "@/lib/email"

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/

const publishUpdateSchema = z
  .object({
    moduleId: z.string().min(1).max(200),
    moduleTitle: z.string().min(1).max(200),
    targetType: z.enum(["team", "user", "all"]),
    team: z.string().min(1).max(120).optional(),
    userIds: z.array(z.string().uuid()).optional(),
    dueDate: z.string().regex(isoDatePattern).optional(),
    note: z.string().max(800).optional(),
    sendEmail: z.boolean().default(true),
    updateTitle: z.string().min(1).max(200).optional(),
  })
  .superRefine((payload, ctx) => {
    if (payload.targetType === "team" && !payload.team) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "team is required when targetType=team",
        path: ["team"],
      })
    }
    if (payload.targetType === "user" && (!payload.userIds || payload.userIds.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "userIds is required when targetType=user",
        path: ["userIds"],
      })
    }
  })

type LearnerProfile = {
  id: string
  email: string
  full_name: string | null
  team: string | null
}

type AdminSupabase = Awaited<ReturnType<typeof createAdminClient>>

function getHubUrl(): string {
  const base = process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  return `${base.replace(/\/+$/, "")}/hub`
}

async function requireAdminProfile() {
  const session = await getSessionContext()
  if (!session?.profile) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }
  if (!hasAdminRole(session.profile)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  }
  return { profile: session.profile }
}

async function upsertUserAssignment(
  supabase: AdminSupabase,
  moduleId: string,
  userId: string,
  dueDate: string | undefined,
  adminId: string,
) {
  const { data: existing, error: existingError } = await supabase
    .from("module_assignments")
    .select("id")
    .eq("module_source", "lh")
    .eq("module_id", moduleId)
    .eq("user_id", userId)
    .is("team", null)
    .eq("is_active", true)
    .maybeSingle()

  if (existingError) {
    throw existingError
  }

  if (existing) {
    const { error } = await supabase
      .from("module_assignments")
      .update({ due_date: dueDate || null, is_active: true })
      .eq("id", existing.id)
    if (error) throw error
    return "updated" as const
  }

  const { error } = await supabase.from("module_assignments").insert({
    module_source: "lh",
    module_id: moduleId,
    user_id: userId,
    team: null,
    due_date: dueDate || null,
    is_active: true,
    created_by: adminId,
  })
  if (error) throw error
  return "created" as const
}

async function upsertTeamAssignment(
  supabase: AdminSupabase,
  moduleId: string,
  team: string,
  dueDate: string | undefined,
  adminId: string,
) {
  const { data: existing, error: existingError } = await supabase
    .from("module_assignments")
    .select("id")
    .eq("module_source", "lh")
    .eq("module_id", moduleId)
    .eq("team", team)
    .is("user_id", null)
    .eq("is_active", true)
    .maybeSingle()

  if (existingError) {
    throw existingError
  }

  if (existing) {
    const { error } = await supabase
      .from("module_assignments")
      .update({ due_date: dueDate || null, is_active: true })
      .eq("id", existing.id)
    if (error) throw error
    return "updated" as const
  }

  const { error } = await supabase.from("module_assignments").insert({
    module_source: "lh",
    module_id: moduleId,
    user_id: null,
    team,
    due_date: dueDate || null,
    is_active: true,
    created_by: adminId,
  })
  if (error) throw error
  return "created" as const
}

export async function POST(request: Request) {
  const auth = await requireAdminProfile()
  if (auth.error) {
    return auth.error
  }

  try {
    const payload = await request.json()
    const parsed = publishUpdateSchema.safeParse(payload)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid update payload", details: parsed.error.issues },
        { status: 400 },
      )
    }

    const update = parsed.data
    const supabase = await createAdminClient()

    let recipients: LearnerProfile[] = []
    if (update.targetType === "user") {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, team")
        .in("id", update.userIds || [])
      if (error) throw error
      recipients = data || []
    } else if (update.targetType === "team") {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, team")
        .eq("team", update.team || "")
        .eq("role", "learner")
      if (error) throw error
      recipients = data || []
    } else {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, team")
        .eq("role", "learner")
      if (error) throw error
      recipients = data || []
    }

    const assignmentStats = { created: 0, updated: 0 }
    if (update.targetType === "team") {
      const outcome = await upsertTeamAssignment(
        supabase,
        update.moduleId,
        update.team || "",
        update.dueDate,
        auth.profile.id,
      )
      assignmentStats[outcome] += 1
    } else {
      const uniqueUserIds = [...new Set(recipients.map((recipient) => recipient.id))]
      for (const userId of uniqueUserIds) {
        const outcome = await upsertUserAssignment(
          supabase,
          update.moduleId,
          userId,
          update.dueDate,
          auth.profile.id,
        )
        assignmentStats[outcome] += 1
      }
    }

    const preferenceRows = recipients.length
      ? await supabase
          .from("notification_preferences")
          .select("user_id, email_digest")
          .in("user_id", recipients.map((recipient) => recipient.id))
      : { data: [], error: null }
    if (preferenceRows.error) throw preferenceRows.error

    const digestEnabled = new Map<string, boolean>()
    for (const row of preferenceRows.data || []) {
      digestEnabled.set(row.user_id, row.email_digest)
    }

    const emailStats = { sent: 0, skipped: 0, failed: 0 }
    const emailProviderConfigured = isEmailProviderConfigured()
    const canSendEmail = update.sendEmail && emailProviderConfigured
    const updateTitle = update.updateTitle || "New Learning Update"
    const hubUrl = getHubUrl()

    if (canSendEmail) {
      for (const recipient of recipients) {
        if (digestEnabled.get(recipient.id) === false) {
          emailStats.skipped += 1
          continue
        }

        const result = await sendEmail({
          to: recipient.email,
          type: "update",
          data: {
            userName: recipient.full_name || recipient.email,
            moduleTitle: update.moduleTitle,
            updateTitle,
            dueDate: update.dueDate,
            note: update.note,
            hubUrl,
          },
        })

        if (result.success) {
          emailStats.sent += 1
        } else {
          emailStats.failed += 1
        }
      }
    } else if (update.sendEmail) {
      emailStats.skipped = recipients.length
    }

    const analyticsEvents = [
      {
        user_id: auth.profile.id,
        event_type: "update_published",
        module_id: update.moduleId,
        metadata: {
          targetType: update.targetType,
          targetCount: recipients.length,
          assignmentStats,
          emailStats,
          dueDate: update.dueDate || null,
        },
      },
      ...recipients.slice(0, 2000).map((recipient) => ({
        user_id: recipient.id,
        event_type: "update_assigned",
        module_id: update.moduleId,
        metadata: {
          targetType: update.targetType,
          dueDate: update.dueDate || null,
        },
      })),
    ]

    const { error: analyticsError } = await supabase
      .from("analytics_events")
      .insert(analyticsEvents)
    if (analyticsError) {
      console.error("Failed to persist update analytics events:", analyticsError)
    }

    return NextResponse.json({
      success: true,
      moduleId: update.moduleId,
      targetType: update.targetType,
      recipients: recipients.length,
      assignmentStats,
      emailStats,
      emailProviderConfigured,
    })
  } catch (error) {
    console.error("Error publishing update:", error)
    return NextResponse.json({ error: "Failed to publish update" }, { status: 500 })
  }
}
