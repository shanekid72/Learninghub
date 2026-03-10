"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileBarChart, Download, Calendar, Users, BookOpen, Award, Loader2 } from "lucide-react"

type ReportType = "users" | "modules" | "quizzes" | "certificates" | "summary"

interface ReportCard {
  title: string
  description: string
  icon: typeof Users
  color: string
  bgColor: string
  type: ReportType
}

const reports: ReportCard[] = [
  {
    title: "User Progress Report",
    description: "Detailed breakdown of each user's learning progress across all modules",
    icon: Users,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    type: "users",
  },
  {
    title: "Module Completion Report",
    description: "Module-by-module completion rates and engagement metrics",
    icon: BookOpen,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
    type: "modules",
  },
  {
    title: "Quiz Performance Report",
    description: "Quiz scores, pass rates, and question-level analytics",
    icon: FileBarChart,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    type: "quizzes",
  },
  {
    title: "Certificate Report",
    description: "All certificates issued with user details and completion dates",
    icon: Award,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    type: "certificates",
  },
  {
    title: "Monthly Summary",
    description: "Overall platform activity and trends for the current month",
    icon: Calendar,
    color: "text-cyan-500",
    bgColor: "bg-cyan-500/10",
    type: "summary",
  },
]

async function downloadReport(type: ReportType, startDate?: string, endDate?: string) {
  const params = new URLSearchParams()
  if (startDate) params.set("startDate", startDate)
  if (endDate) params.set("endDate", endDate)

  const query = params.toString()
  const url = `/api/admin/reports/${type}${query ? `?${query}` : ""}`

  const response = await fetch(url)
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    throw new Error(payload.error || "Failed to export report")
  }

  const blob = await response.blob()
  const href = URL.createObjectURL(blob)
  const filename = response.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] || `${type}-report.csv`

  const anchor = document.createElement("a")
  anchor.href = href
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  URL.revokeObjectURL(href)
  document.body.removeChild(anchor)
}

export default function AdminReportsPage() {
  const [loadingType, setLoadingType] = React.useState<ReportType | null>(null)
  const [customStartDate, setCustomStartDate] = React.useState("")
  const [customEndDate, setCustomEndDate] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)

  const handleExport = async (type: ReportType, startDate?: string, endDate?: string) => {
    setError(null)
    setLoadingType(type)
    try {
      await downloadReport(type, startDate, endDate)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to export report")
    } finally {
      setLoadingType(null)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Reports</h1>
        <p className="text-neutral-400 mt-1">Generate and export analytics reports</p>
      </div>

      {error && (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reports.map((report) => (
          <Card key={report.title} className="bg-neutral-900 border-neutral-800">
            <CardHeader>
              <div className={`w-12 h-12 rounded-lg ${report.bgColor} flex items-center justify-center mb-4`}>
                <report.icon className={`w-6 h-6 ${report.color}`} />
              </div>
              <CardTitle className="text-white">{report.title}</CardTitle>
              <CardDescription className="text-neutral-400">
                {report.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                className="w-full border-neutral-700 text-neutral-300 hover:bg-neutral-800 hover:text-white"
                onClick={() => handleExport(report.type)}
                disabled={loadingType === report.type}
              >
                {loadingType === report.type ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                Export CSV
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-neutral-900 border-neutral-800">
        <CardHeader>
          <CardTitle className="text-white">Custom Summary Report</CardTitle>
          <CardDescription className="text-neutral-400">
            Export summary metrics for a specific date range
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="text-sm text-neutral-400 mb-2 block">Start Date</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(event) => setCustomStartDate(event.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-white"
              />
            </div>
            <div className="flex-1">
              <label className="text-sm text-neutral-400 mb-2 block">End Date</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(event) => setCustomEndDate(event.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-white"
              />
            </div>
            <div className="flex items-end">
              <Button
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={() => handleExport("summary", customStartDate, customEndDate)}
                disabled={loadingType === "summary"}
              >
                {loadingType === "summary" ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                Generate Report
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
