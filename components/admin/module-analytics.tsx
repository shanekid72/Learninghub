"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import { Eye, CheckCircle2, Target, BookOpen } from "lucide-react"

interface ModuleStat {
  moduleId: string
  views: number
  completions: number
  avgScore: number
  attempts: number
  completionRate: number
}

interface ModuleAnalyticsProps {
  moduleStats: ModuleStat[]
}

export function ModuleAnalytics({ moduleStats }: ModuleAnalyticsProps) {
  const totalViews = moduleStats.reduce((sum, m) => sum + m.views, 0)
  const totalCompletions = moduleStats.reduce((sum, m) => sum + m.completions, 0)
  const avgCompletionRate = moduleStats.length > 0
    ? Math.round(moduleStats.reduce((sum, m) => sum + m.completionRate, 0) / moduleStats.length)
    : 0

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-neutral-900 border-neutral-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-400">Total Views</p>
                <p className="text-2xl font-bold text-white">{totalViews}</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-500/10">
                <Eye className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-neutral-900 border-neutral-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-400">Total Completions</p>
                <p className="text-2xl font-bold text-white">{totalCompletions}</p>
              </div>
              <div className="p-3 rounded-lg bg-emerald-500/10">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-neutral-900 border-neutral-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-400">Avg Completion Rate</p>
                <p className="text-2xl font-bold text-white">{avgCompletionRate}%</p>
              </div>
              <div className="p-3 rounded-lg bg-purple-500/10">
                <Target className="w-6 h-6 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-neutral-900 border-neutral-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Module Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          {moduleStats.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-neutral-400">No module data available yet</p>
              <p className="text-sm text-neutral-500 mt-1">
                Analytics will appear as users interact with modules
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-neutral-800 hover:bg-transparent">
                  <TableHead className="text-neutral-400">Module</TableHead>
                  <TableHead className="text-neutral-400 text-center">Views</TableHead>
                  <TableHead className="text-neutral-400 text-center">Completions</TableHead>
                  <TableHead className="text-neutral-400">Completion Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {moduleStats
                  .sort((a, b) => b.views - a.views)
                  .map((module) => (
                    <TableRow key={module.moduleId} className="border-neutral-800">
                      <TableCell className="font-medium text-white">
                        {module.moduleId}
                      </TableCell>
                      <TableCell className="text-center text-neutral-300">
                        {module.views}
                      </TableCell>
                      <TableCell className="text-center text-neutral-300">
                        {module.completions}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Progress 
                            value={module.completionRate} 
                            className="h-2 flex-1"
                          />
                          <span className="text-sm text-neutral-400 w-12 text-right">
                            {module.completionRate}%
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
