import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import { sendEmail } from "@/lib/email"
import type { Database } from "@/lib/supabase/database.types"

const DEFAULT_LOOKAHEAD_DAYS = 3
const MAX_EMAILS_PER_RUN = 200

type Candidate = {
  userId: string
  moduleId: string
  dueDate: string
}

type UpstreamModule = {
  id: string | number
  title?: string
}

type AnalyticsEventInsert = Database["public"]["Tables"]["analytics_events"]["Insert"]

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function startOfUtcDay(date: Date): Date {
  const copy = new Date(date)
  copy.setUTCHours(0, 0, 0, 0)
  return copy
}

function getHubUrl(): string {
  const base = process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  return `${base.replace(/\/+$/, "")}/hub`
}

function createPairKey(userId: string, moduleId: string): string {
  return `${userId}:${moduleId}`
}

function getBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null
  const value = authHeader.trim()
  if (!value.toLowerCase().startsWith("bearer ")) return null
  return value.slice(7).trim() || null
}

async function fetchModuleTitleMap(): Promise<Map<string, string>> {
  const base = process.env.LH_BASE_URL
  const key = process.env.LH_API_KEY
  if (!base || !key) return new Map()

  try {
    const res = await fetch(`${base}?action=modules&key=${encodeURIComponent(key)}`, { cache: "no-store" })
    const contentType = res.headers.get("content-type") || ""
    if (!contentType.includes("application/json")) return new Map()

    const json = (await res.json()) as { modules?: UpstreamModule[] }
    const map = new Map<string, string>()
    for (const moduleItem of json.modules || []) {
      if (!moduleItem?.title) continue
      map.set(String(moduleItem.id), moduleItem.title)
    }
    return map
  } catch (error) {
    console.error("Failed to fetch module titles for reminder job:", error)
    return new Map()
  }
}

async function runReminderJob(request: Request) {
  const url = new URL(request.url)
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 500 })
  }

  const headerSecret = request.headers.get("x-cron-secret")
  const bearerSecret = getBearerToken(request.headers.get("authorization"))
  const querySecret = url.searchParams.get("secret")
  if (
    headerSecret !== cronSecret &&
    bearerSecret !== cronSecret &&
    querySecret !== cronSecret
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const dryRun = url.searchParams.get("dryRun") === "1"
  const lookAheadRaw = Number(url.searchParams.get("days") || DEFAULT_LOOKAHEAD_DAYS)
  const lookAheadDays = Number.isFinite(lookAheadRaw)
    ? Math.min(Math.max(Math.round(lookAheadRaw), 1), 14)
    : DEFAULT_LOOKAHEAD_DAYS

  const now = new Date()
  const todayUtc = startOfUtcDay(now)
  const todayIso = todayUtc.toISOString()
  const thresholdDate = new Date(todayUtc)
  thresholdDate.setUTCDate(thresholdDate.getUTCDate() + lookAheadDays)
  const thresholdDateOnly = toDateOnly(thresholdDate)

  const supabase = await createAdminClient()
  const { data: assignments, error: assignmentError } = await supabase
    .from("module_assignments")
    .select("module_id, due_date, user_id, team")
    .eq("module_source", "lh")
    .eq("is_active", true)
    .not("due_date", "is", null)
    .lte("due_date", thresholdDateOnly)

  if (assignmentError) {
    console.error("Reminder job failed fetching assignments:", assignmentError)
    return NextResponse.json({ error: "Failed to fetch assignments" }, { status: 500 })
  }

  const directCandidates = new Map<string, Candidate>()
  const teamTargets = new Set<string>()
  for (const assignment of assignments || []) {
    if (!assignment.due_date) continue
    if (assignment.user_id) {
      directCandidates.set(
        createPairKey(assignment.user_id, assignment.module_id),
        { userId: assignment.user_id, moduleId: assignment.module_id, dueDate: assignment.due_date },
      )
    } else if (assignment.team) {
      teamTargets.add(assignment.team)
    }
  }

  if (teamTargets.size > 0) {
    const { data: teamUsers, error: teamUsersError } = await supabase
      .from("profiles")
      .select("id, team, role")
      .in("team", [...teamTargets])
      .eq("role", "learner")

    if (teamUsersError) {
      console.error("Reminder job failed fetching team users:", teamUsersError)
      return NextResponse.json({ error: "Failed to resolve team assignments" }, { status: 500 })
    }

    const assignmentsByTeam = new Map<string, { module_id: string; due_date: string }[]>()
    for (const assignment of assignments || []) {
      if (!assignment.team || !assignment.due_date) continue
      const bucket = assignmentsByTeam.get(assignment.team) || []
      bucket.push({ module_id: assignment.module_id, due_date: assignment.due_date })
      assignmentsByTeam.set(assignment.team, bucket)
    }

    for (const user of teamUsers || []) {
      if (!user.team) continue
      for (const teamAssignment of assignmentsByTeam.get(user.team) || []) {
        const key = createPairKey(user.id, teamAssignment.module_id)
        const existing = directCandidates.get(key)
        if (!existing || teamAssignment.due_date < existing.dueDate) {
          directCandidates.set(key, {
            userId: user.id,
            moduleId: teamAssignment.module_id,
            dueDate: teamAssignment.due_date,
          })
        }
      }
    }
  }

  const candidates = [...directCandidates.values()]
  if (candidates.length === 0) {
    return NextResponse.json({
      success: true,
      message: "No due assignments found",
      lookedAheadDays: lookAheadDays,
      consideredAssignments: 0,
      emailed: 0,
    })
  }

  const candidateUserIds = [...new Set(candidates.map((candidate) => candidate.userId))]
  const candidateModuleIds = [...new Set(candidates.map((candidate) => candidate.moduleId))]

  const [profilesResult, preferencesResult, alreadyRemindedResult, completedResult, moduleTitleMap] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, full_name")
      .in("id", candidateUserIds),
    supabase
      .from("notification_preferences")
      .select("user_id, email_reminders")
      .in("user_id", candidateUserIds),
    supabase
      .from("analytics_events")
      .select("user_id, module_id")
      .eq("event_type", "reminder_sent")
      .gte("created_at", todayIso)
      .in("user_id", candidateUserIds)
      .in("module_id", candidateModuleIds),
    supabase
      .from("analytics_events")
      .select("user_id, module_id")
      .eq("event_type", "module_complete")
      .in("user_id", candidateUserIds)
      .in("module_id", candidateModuleIds),
    fetchModuleTitleMap(),
  ])

  if (profilesResult.error || preferencesResult.error || alreadyRemindedResult.error || completedResult.error) {
    console.error("Reminder job failed while loading related data:", {
      profilesError: profilesResult.error,
      preferencesError: preferencesResult.error,
      alreadyRemindedError: alreadyRemindedResult.error,
      completedError: completedResult.error,
    })
    return NextResponse.json({ error: "Failed to load reminder context" }, { status: 500 })
  }

  const usersById = new Map(
    (profilesResult.data || []).map((profile) => [profile.id, profile]),
  )
  const reminderEnabledByUser = new Map(
    (preferencesResult.data || []).map((row) => [row.user_id, row.email_reminders]),
  )
  const alreadyRemindedToday = new Set(
    (alreadyRemindedResult.data || [])
      .filter((row) => row.user_id && row.module_id)
      .map((row) => createPairKey(row.user_id as string, row.module_id as string)),
  )
  const completedPairs = new Set(
    (completedResult.data || [])
      .filter((row) => row.user_id && row.module_id)
      .map((row) => createPairKey(row.user_id as string, row.module_id as string)),
  )

  const sortedCandidates = candidates
    .filter((candidate) => !completedPairs.has(createPairKey(candidate.userId, candidate.moduleId)))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, MAX_EMAILS_PER_RUN)

  const runStats = {
    considered: sortedCandidates.length,
    sent: 0,
    skippedPreferences: 0,
    skippedAlreadyReminded: 0,
    skippedNoProfile: 0,
    failed: 0,
    dryRun,
  }

  const analyticsEvents: AnalyticsEventInsert[] = []

  for (const candidate of sortedCandidates) {
    const key = createPairKey(candidate.userId, candidate.moduleId)
    if (alreadyRemindedToday.has(key)) {
      runStats.skippedAlreadyReminded += 1
      continue
    }

    if (reminderEnabledByUser.get(candidate.userId) === false) {
      runStats.skippedPreferences += 1
      continue
    }

    const user = usersById.get(candidate.userId)
    if (!user?.email) {
      runStats.skippedNoProfile += 1
      continue
    }

    const moduleTitle = moduleTitleMap.get(candidate.moduleId) || candidate.moduleId
    if (!dryRun) {
      const result = await sendEmail({
        to: user.email,
        type: "update",
        data: {
          userName: user.full_name || user.email,
          moduleTitle,
          updateTitle: "Reminder: Module Due Soon",
          dueDate: candidate.dueDate,
          note: "This is an automated reminder based on your current assignments.",
          hubUrl: getHubUrl(),
        },
      })

      if (!result.success) {
        runStats.failed += 1
        continue
      }
    }

    runStats.sent += 1
    analyticsEvents.push({
      user_id: candidate.userId,
      event_type: "reminder_sent",
      module_id: candidate.moduleId,
      metadata: {
        dueDate: candidate.dueDate,
        source: "assignment-reminder-cron",
        dryRun,
      },
    })
  }

  if (analyticsEvents.length > 0) {
    const { error } = await supabase.from("analytics_events").insert(analyticsEvents)
    if (error) {
      console.error("Failed to insert reminder analytics events:", error)
    }
  }

  return NextResponse.json({
    success: true,
    lookedAheadDays: lookAheadDays,
    stats: runStats,
  })
}

export async function GET(request: Request) {
  return runReminderJob(request)
}

export async function POST(request: Request) {
  return runReminderJob(request)
}
