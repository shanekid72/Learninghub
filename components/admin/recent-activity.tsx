"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDistanceToNow } from "date-fns"
import { 
  Eye, 
  CheckCircle2, 
  Play, 
  Award, 
  MessageSquare,
  Search,
  Activity
} from "lucide-react"

interface AnalyticsEvent {
  id: string
  user_id: string | null
  event_type: string
  module_id: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

interface RecentActivityProps {
  events: AnalyticsEvent[]
}

const eventIcons: Record<string, { icon: typeof Eye; color: string }> = {
  module_view: { icon: Eye, color: "text-blue-500" },
  module_complete: { icon: CheckCircle2, color: "text-emerald-500" },
  quiz_start: { icon: Play, color: "text-purple-500" },
  quiz_complete: { icon: Award, color: "text-amber-500" },
  certificate_generated: { icon: Award, color: "text-yellow-500" },
  comment_created: { icon: MessageSquare, color: "text-cyan-500" },
  search: { icon: Search, color: "text-neutral-500" },
}

const eventLabels: Record<string, string> = {
  module_view: "Module viewed",
  module_complete: "Module completed",
  quiz_start: "Quiz started",
  quiz_complete: "Quiz completed",
  certificate_generated: "Certificate generated",
  comment_created: "Comment posted",
  search: "Search performed",
}

export function RecentActivity({ events }: RecentActivityProps) {
  if (events.length === 0) {
    return (
      <Card className="bg-neutral-900 border-neutral-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-neutral-400 text-center py-8">No recent activity</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-neutral-900 border-neutral-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {events.map((event) => {
            const { icon: Icon, color } = eventIcons[event.event_type] || { 
              icon: Activity, 
              color: "text-neutral-500" 
            }
            const label = eventLabels[event.event_type] || event.event_type

            return (
              <div 
                key={event.id} 
                className="flex items-start gap-3 p-3 rounded-lg bg-neutral-800/50"
              >
                <div className={`p-2 rounded-lg bg-neutral-800 ${color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium">{label}</p>
                  {event.module_id && (
                    <p className="text-xs text-neutral-400 truncate">
                      Module: {event.module_id}
                    </p>
                  )}
                  <p className="text-xs text-neutral-500 mt-1">
                    {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
