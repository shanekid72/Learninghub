"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Award, ClipboardCheck, BookCheck, Target, TrendingUp } from "lucide-react"

interface DashboardStatsProps {
  stats: {
    totalUsers: number
    totalCertificates: number
    totalQuizAttempts: number
    moduleCompletions: number
    avgQuizScore: number
    quizPassRate: number
  }
}

export function DashboardStats({ stats }: DashboardStatsProps) {
  const statCards = [
    {
      title: "Total Users",
      value: stats.totalUsers,
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10"
    },
    {
      title: "Certificates Issued",
      value: stats.totalCertificates,
      icon: Award,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10"
    },
    {
      title: "Quiz Attempts",
      value: stats.totalQuizAttempts,
      icon: ClipboardCheck,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10"
    },
    {
      title: "Module Completions",
      value: stats.moduleCompletions,
      icon: BookCheck,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10"
    },
    {
      title: "Avg Quiz Score",
      value: `${stats.avgQuizScore}%`,
      icon: Target,
      color: "text-cyan-500",
      bgColor: "bg-cyan-500/10"
    },
    {
      title: "Quiz Pass Rate",
      value: `${stats.quizPassRate}%`,
      icon: TrendingUp,
      color: "text-green-500",
      bgColor: "bg-green-500/10"
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {statCards.map((stat) => (
        <Card key={stat.title} className="bg-neutral-900 border-neutral-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-neutral-400">
              {stat.title}
            </CardTitle>
            <div className={`p-2 rounded-lg ${stat.bgColor}`}>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-white">{stat.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
