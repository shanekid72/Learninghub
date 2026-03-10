"use client"

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

interface AnalyticsChartsProps {
  completionData: CompletionData[]
  statusData: StatusData[]
}

export function AnalyticsCharts({ completionData, statusData }: AnalyticsChartsProps) {
  const hasStatusData = statusData.some((entry) => entry.value > 0)

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
          <h4 className="text-sm font-medium text-neutral-400 mb-4">Activity Distribution</h4>
          {hasStatusData ? (
            <>
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
            </>
          ) : (
            <p className="text-neutral-500 text-sm text-center py-8">No activity data yet.</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
