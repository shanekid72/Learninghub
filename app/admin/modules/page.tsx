import { createAdminClient } from "@/lib/supabase/server"
import { ModuleAnalytics } from "@/components/admin/module-analytics"

function asObject<T>(value: T | T[] | null): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] || null : value
}

export default async function AdminModulesPage() {
  const supabase = await createAdminClient()

  const { data: completionEvents } = await supabase
    .from("analytics_events")
    .select("module_id, created_at")
    .eq("event_type", "module_complete")

  const { data: viewEvents } = await supabase
    .from("analytics_events")
    .select("module_id, created_at")
    .eq("event_type", "module_view")

  const { data: quizAttempts } = await supabase
    .from("quiz_attempts")
    .select(`
      score,
      passed,
      quizzes (
        module_id
      )
    `)

  const moduleStats = new Map<string, { views: number; completions: number; scoreTotal: number; attempts: number }>()

  viewEvents?.forEach(event => {
    if (event.module_id) {
      const current = moduleStats.get(event.module_id) || { views: 0, completions: 0, scoreTotal: 0, attempts: 0 }
      current.views++
      moduleStats.set(event.module_id, current)
    }
  })

  completionEvents?.forEach(event => {
    if (event.module_id) {
      const current = moduleStats.get(event.module_id) || { views: 0, completions: 0, scoreTotal: 0, attempts: 0 }
      current.completions++
      moduleStats.set(event.module_id, current)
    }
  })

  quizAttempts?.forEach((attempt) => {
    const quiz = asObject(attempt.quizzes)
    if (!quiz?.module_id) return

    const current = moduleStats.get(quiz.module_id) || { views: 0, completions: 0, scoreTotal: 0, attempts: 0 }
    current.attempts++
    current.scoreTotal += attempt.score
    moduleStats.set(quiz.module_id, current)
  })

  const moduleStatsArray = Array.from(moduleStats.entries()).map(([moduleId, stats]) => ({
    moduleId,
    views: stats.views,
    completions: stats.completions,
    attempts: stats.attempts,
    avgScore: stats.attempts > 0 ? Math.round(stats.scoreTotal / stats.attempts) : 0,
    completionRate: stats.views > 0 ? Math.round((stats.completions / stats.views) * 100) : 0
  }))

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Module Analytics</h1>
        <p className="text-neutral-400 mt-1">Track module performance and engagement</p>
      </div>

      <ModuleAnalytics moduleStats={moduleStatsArray} />
    </div>
  )
}
