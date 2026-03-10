import { createAdminClient } from "@/lib/supabase/server"
import { DashboardStats } from "@/components/admin/dashboard-stats"
import { AnalyticsCharts } from "@/components/admin/analytics-charts"
import { RecentActivity } from "@/components/admin/recent-activity"

export default async function AdminDashboard() {
  const supabase = await createAdminClient()

  const [usersResult, certificatesResult, attemptsResult, eventsResult] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("certificates").select("*", { count: "exact", head: true }),
    supabase.from("quiz_attempts").select("*", { count: "exact", head: true }),
    supabase
      .from("analytics_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10)
  ])

  const [{ data: completionEvents }, { data: viewEvents }, { data: quizAttempts }] = await Promise.all([
    supabase
      .from("analytics_events")
      .select("created_at")
      .eq("event_type", "module_complete"),
    supabase
      .from("analytics_events")
      .select("created_at")
      .eq("event_type", "module_view"),
    supabase
      .from("quiz_attempts")
      .select("score, passed"),
  ])

  const avgScore = quizAttempts?.length
    ? Math.round(quizAttempts.reduce((sum, attempt) => sum + attempt.score, 0) / quizAttempts.length)
    : 0

  const passRate = quizAttempts?.length
    ? Math.round((quizAttempts.filter((attempt) => attempt.passed).length / quizAttempts.length) * 100)
    : 0

  const completionData = (() => {
    const now = new Date()
    const series = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(now)
      date.setDate(now.getDate() - (6 - index))
      const key = date.toISOString().slice(0, 10)
      const name = date.toLocaleDateString("en-US", { weekday: "short" })
      return { key, name, completions: 0 }
    })

    const indexByDate = new Map(series.map((entry, idx) => [entry.key, idx]))
    for (const event of completionEvents || []) {
      const key = event.created_at.slice(0, 10)
      const idx = indexByDate.get(key)
      if (idx !== undefined) {
        series[idx].completions += 1
      }
    }

    return series.map(({ name, completions }) => ({ name, completions }))
  })()

  const statusData = [
    { name: "Module Views", value: viewEvents?.length || 0 },
    { name: "Completions", value: completionEvents?.length || 0 },
    { name: "Quiz Passed", value: quizAttempts?.filter((attempt) => attempt.passed).length || 0 },
    { name: "Quiz Failed", value: quizAttempts?.filter((attempt) => !attempt.passed).length || 0 },
  ]

  const stats = {
    totalUsers: usersResult.count || 0,
    totalCertificates: certificatesResult.count || 0,
    totalQuizAttempts: attemptsResult.count || 0,
    moduleCompletions: completionEvents?.length || 0,
    avgQuizScore: avgScore,
    quizPassRate: passRate
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-neutral-400 mt-1">Overview of your learning platform</p>
      </div>

      <DashboardStats stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnalyticsCharts completionData={completionData} statusData={statusData} />
        <RecentActivity events={eventsResult.data || []} />
      </div>
    </div>
  )
}
