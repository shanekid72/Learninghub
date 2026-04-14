import { createAdminClient } from "@/lib/supabase/server"
import type { Database } from "@/lib/supabase/database.types"

type AnalyticsInsert = Database["public"]["Tables"]["analytics_events"]["Insert"]
type AnalyticsMetadata = AnalyticsInsert["metadata"]
type AdminSupabase = Awaited<ReturnType<typeof createAdminClient>>

interface RecordAnalyticsEventParams {
  userId?: string | null
  type: string
  moduleId?: string | null
  metadata?: AnalyticsMetadata
}

export async function recordAnalyticsEvent(
  params: RecordAnalyticsEventParams,
  supabase?: AdminSupabase,
) {
  const client = supabase || (await createAdminClient())

  const { error } = await client.from("analytics_events").insert({
    user_id: params.userId || null,
    event_type: params.type,
    module_id: params.moduleId || null,
    metadata: params.metadata ?? null,
  })

  if (error) {
    console.error("Failed to record analytics event:", error)
    return false
  }

  return true
}
