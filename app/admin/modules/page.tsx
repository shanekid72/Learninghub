import { createClient } from "@/lib/supabase/server"
import { ModuleAnalytics } from "@/components/admin/module-analytics"

export default async function AdminModulesPage() {
  const supabase = await createClient()

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

  const moduleStats = new Map<string, { views: number; completions: number; avgScore: number; attempts: number }>()

  viewEvents?.forEach(event => {
    if (event.module_id) {
      const current = moduleStats.get(event.module_id) || { views: 0, completions: 0, avgScore: 0, attempts: 0 }
      current.views++
      moduleStats.set(event.module_id, current)
    }
  })

  completionEvents?.forEach(event => {
    if (event.module_id) {
      const current = moduleStats.get(event.module_id) || { views: 0, completions: 0, avgScore: 0, attempts: 0 }
      current.completions++
      moduleStats.set(event.module_id, current)
    }
  })

  const moduleStatsArray = Array.from(moduleStats.entries()).map(([moduleId, stats]) => ({
    moduleId,
    ...stats,
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
