import { createClient } from "@/lib/supabase/server"
import { DashboardStats } from "@/components/admin/dashboard-stats"
import { AnalyticsCharts } from "@/components/admin/analytics-charts"
import { RecentActivity } from "@/components/admin/recent-activity"

export default async function AdminDashboard() {
  const supabase = await createClient()

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

  const { data: completionEvents } = await supabase
    .from("analytics_events")
    .select("*")
    .eq("event_type", "module_complete")

  const { data: quizAttempts } = await supabase
    .from("quiz_attempts")
    .select("score, passed")

  const avgScore = quizAttempts?.length 
    ? Math.round(quizAttempts.reduce((sum, a) => sum + a.score, 0) / quizAttempts.length)
    : 0

  const passRate = quizAttempts?.length
    ? Math.round((quizAttempts.filter(a => a.passed).length / quizAttempts.length) * 100)
    : 0

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
        <AnalyticsCharts />
        <RecentActivity events={eventsResult.data || []} />
      </div>
    </div>
  )
}
