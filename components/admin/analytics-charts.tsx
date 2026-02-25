"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts"

interface CompletionData {
  name: string
  completions: number
}

interface StatusData {
  name: string
  value: number
}

const COLORS = ['#10b981', '#f59e0b', '#6366f1', '#ec4899']

export function AnalyticsCharts() {
  const [completionData, setCompletionData] = useState<CompletionData[]>([])
  const [statusData, setStatusData] = useState<StatusData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    try {
      const mockCompletionData: CompletionData[] = [
        { name: "Mon", completions: 12 },
        { name: "Tue", completions: 19 },
        { name: "Wed", completions: 15 },
        { name: "Thu", completions: 22 },
        { name: "Fri", completions: 18 },
        { name: "Sat", completions: 8 },
        { name: "Sun", completions: 5 }
      ]

      const mockStatusData: StatusData[] = [
        { name: "Completed", value: 45 },
        { name: "In Progress", value: 30 },
        { name: "Not Started", value: 20 },
        { name: "Overdue", value: 5 }
      ]

      setCompletionData(mockCompletionData)
      setStatusData(mockStatusData)
    } catch (error) {
      console.error("Failed to fetch analytics:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card className="bg-neutral-900 border-neutral-800">
        <CardContent className="h-80 flex items-center justify-center">
          <p className="text-neutral-400">Loading analytics...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-neutral-900 border-neutral-800">
      <CardHeader>
        <CardTitle className="text-white">Module Completions (This Week)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={completionData}>
              <XAxis 
                dataKey="name" 
                stroke="#737373" 
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                stroke="#737373" 
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#262626', 
                  border: '1px solid #404040',
                  borderRadius: '8px'
                }}
                labelStyle={{ color: '#fff' }}
              />
              <Bar 
                dataKey="completions" 
                fill="#10b981" 
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-8">
          <h4 className="text-sm font-medium text-neutral-400 mb-4">Status Distribution</h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {statusData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#262626', 
                    border: '1px solid #404040',
                    borderRadius: '8px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-4 justify-center mt-2">
            {statusData.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="text-sm text-neutral-400">{entry.name}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
