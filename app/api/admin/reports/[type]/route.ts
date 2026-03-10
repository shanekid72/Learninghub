import { NextResponse } from "next/server"
import { getSessionContext, hasAdminRole } from "@/lib/app-session"
import { createAdminClient } from "@/lib/supabase/server"

type ReportType = "users" | "modules" | "quizzes" | "certificates" | "summary"

function escapeCsvValue(value: unknown): string {
  const stringValue = value === null || value === undefined ? "" : String(value)
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, "\"\"")}"`
  }
  return stringValue
}

function toCsv(rows: Array<Record<string, unknown>>): string {
  if (rows.length === 0) return "no_data\n"
  const headers = Object.keys(rows[0])
  const csvRows = [headers.join(",")]
  for (const row of rows) {
    csvRows.push(headers.map((header) => escapeCsvValue(row[header])).join(","))
  }
  return `${csvRows.join("\n")}\n`
}

function getDateBounds(searchParams: URLSearchParams): { startIso?: string; endIso?: string } {
  const startDate = searchParams.get("startDate")
  const endDate = searchParams.get("endDate")
  return {
    startIso: startDate ? `${startDate}T00:00:00.000Z` : undefined,
    endIso: endDate ? `${endDate}T23:59:59.999Z` : undefined,
  }
}

function asObject<T>(value: T | T[] | null): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] || null : value
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ type: string }> },
) {
  try {
    const { type } = await params
    if (!["users", "modules", "quizzes", "certificates", "summary"].includes(type)) {
      return NextResponse.json({ error: "Invalid report type" }, { status: 400 })
    }
    const reportType = type as ReportType

    const session = await getSessionContext()
    if (!session?.profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!hasAdminRole(session.profile)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const supabase = await createAdminClient()

    const { searchParams } = new URL(request.url)
    const { startIso, endIso } = getDateBounds(searchParams)

    let filename = `${reportType}-report.csv`
    let csv: string

    if (reportType === "users") {
      const { data: users } = await supabase
        .from("profiles")
        .select("id, email, full_name, role, team, created_at")
        .order("created_at", { ascending: false })

      let completionsQuery = supabase
        .from("analytics_events")
        .select("user_id")
        .eq("event_type", "module_complete")
      if (startIso) completionsQuery = completionsQuery.gte("created_at", startIso)
      if (endIso) completionsQuery = completionsQuery.lte("created_at", endIso)
      const { data: completions } = await completionsQuery

      let attemptsQuery = supabase
        .from("quiz_attempts")
        .select("user_id, score, passed, completed_at")
      if (startIso) attemptsQuery = attemptsQuery.gte("completed_at", startIso)
      if (endIso) attemptsQuery = attemptsQuery.lte("completed_at", endIso)
      const { data: attempts } = await attemptsQuery

      let certificatesQuery = supabase
        .from("certificates")
        .select("user_id, issued_at")
      if (startIso) certificatesQuery = certificatesQuery.gte("issued_at", startIso)
      if (endIso) certificatesQuery = certificatesQuery.lte("issued_at", endIso)
      const { data: certificates } = await certificatesQuery

      const completionByUser = new Map<string, number>()
      for (const completion of completions || []) {
        if (!completion.user_id) continue
        completionByUser.set(completion.user_id, (completionByUser.get(completion.user_id) || 0) + 1)
      }

      const certificateByUser = new Map<string, number>()
      for (const certificate of certificates || []) {
        certificateByUser.set(certificate.user_id, (certificateByUser.get(certificate.user_id) || 0) + 1)
      }

      const attemptByUser = new Map<string, { count: number; passed: number; scoreTotal: number }>()
      for (const attempt of attempts || []) {
        const bucket = attemptByUser.get(attempt.user_id) || { count: 0, passed: 0, scoreTotal: 0 }
        bucket.count += 1
        bucket.scoreTotal += attempt.score
        if (attempt.passed) bucket.passed += 1
        attemptByUser.set(attempt.user_id, bucket)
      }

      const rows = (users || []).map((entry) => {
        const attempt = attemptByUser.get(entry.id) || { count: 0, passed: 0, scoreTotal: 0 }
        const avgScore = attempt.count > 0 ? Math.round(attempt.scoreTotal / attempt.count) : 0
        const passRate = attempt.count > 0 ? Math.round((attempt.passed / attempt.count) * 100) : 0

        return {
          user_id: entry.id,
          email: entry.email,
          full_name: entry.full_name || "",
          role: entry.role,
          team: entry.team || "",
          module_completions: completionByUser.get(entry.id) || 0,
          quiz_attempts: attempt.count,
          avg_quiz_score: avgScore,
          quiz_pass_rate: `${passRate}%`,
          certificates_issued: certificateByUser.get(entry.id) || 0,
          joined_at: entry.created_at,
        }
      })

      csv = toCsv(rows)
      filename = "user-progress-report.csv"
    } else if (reportType === "modules") {
      let eventsQuery = supabase
        .from("analytics_events")
        .select("module_id, event_type, created_at")
        .in("event_type", ["module_view", "module_complete"])
      if (startIso) eventsQuery = eventsQuery.gte("created_at", startIso)
      if (endIso) eventsQuery = eventsQuery.lte("created_at", endIso)
      const { data: events } = await eventsQuery

      const moduleMap = new Map<string, { views: number; completions: number }>()
      for (const event of events || []) {
        if (!event.module_id) continue
        const bucket = moduleMap.get(event.module_id) || { views: 0, completions: 0 }
        if (event.event_type === "module_view") bucket.views += 1
        if (event.event_type === "module_complete") bucket.completions += 1
        moduleMap.set(event.module_id, bucket)
      }

      const rows = Array.from(moduleMap.entries())
        .sort((a, b) => b[1].views - a[1].views)
        .map(([moduleId, stats]) => ({
          module_id: moduleId,
          views: stats.views,
          completions: stats.completions,
          completion_rate: stats.views > 0 ? `${Math.round((stats.completions / stats.views) * 100)}%` : "0%",
        }))

      csv = toCsv(rows)
      filename = "module-completion-report.csv"
    } else if (reportType === "quizzes") {
      let attemptsQuery = supabase
        .from("quiz_attempts")
        .select("id, user_id, score, passed, completed_at, quizzes(module_id, title)")
        .order("completed_at", { ascending: false })
      if (startIso) attemptsQuery = attemptsQuery.gte("completed_at", startIso)
      if (endIso) attemptsQuery = attemptsQuery.lte("completed_at", endIso)
      const { data: attempts } = await attemptsQuery

      const rows = (attempts || []).map((attempt) => {
        const quiz = asObject(attempt.quizzes)
        return {
          attempt_id: attempt.id,
          user_id: attempt.user_id,
          module_id: quiz?.module_id || "",
          quiz_title: quiz?.title || "",
          score: attempt.score,
          passed: attempt.passed,
          completed_at: attempt.completed_at,
        }
      })

      csv = toCsv(rows)
      filename = "quiz-performance-report.csv"
    } else if (reportType === "certificates") {
      let certificatesQuery = supabase
        .from("certificates")
        .select("id, user_id, module_id, issued_at, profiles(email, full_name)")
        .order("issued_at", { ascending: false })
      if (startIso) certificatesQuery = certificatesQuery.gte("issued_at", startIso)
      if (endIso) certificatesQuery = certificatesQuery.lte("issued_at", endIso)
      const { data: certificates } = await certificatesQuery

      const rows = (certificates || []).map((certificate) => {
        const userProfile = asObject(certificate.profiles)
        return {
          certificate_id: certificate.id,
          user_id: certificate.user_id,
          email: userProfile?.email || "",
          full_name: userProfile?.full_name || "",
          module_id: certificate.module_id,
          issued_at: certificate.issued_at,
        }
      })

      csv = toCsv(rows)
      filename = "certificate-report.csv"
    } else {
      const [usersCount, certificatesCount, attemptsCount] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("certificates").select("*", { count: "exact", head: true }),
        supabase.from("quiz_attempts").select("*", { count: "exact", head: true }),
      ])

      let completionQuery = supabase
        .from("analytics_events")
        .select("*", { count: "exact", head: true })
        .eq("event_type", "module_complete")
      if (startIso) completionQuery = completionQuery.gte("created_at", startIso)
      if (endIso) completionQuery = completionQuery.lte("created_at", endIso)
      const completionCount = await completionQuery

      const rows = [
        { metric: "total_users", value: usersCount.count || 0 },
        { metric: "total_certificates", value: certificatesCount.count || 0 },
        { metric: "total_quiz_attempts", value: attemptsCount.count || 0 },
        { metric: "module_completions", value: completionCount.count || 0 },
        { metric: "start_date", value: searchParams.get("startDate") || "" },
        { metric: "end_date", value: searchParams.get("endDate") || "" },
      ]

      csv = toCsv(rows)
      filename = "monthly-summary-report.csv"
    }

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    console.error("Error generating report:", error)
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 })
  }
}
