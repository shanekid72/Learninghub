import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileBarChart, Download, Calendar, Users, BookOpen, Award } from "lucide-react"

export default function AdminReportsPage() {
  const reports = [
    {
      title: "User Progress Report",
      description: "Detailed breakdown of each user's learning progress across all modules",
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10"
    },
    {
      title: "Module Completion Report",
      description: "Module-by-module completion rates and engagement metrics",
      icon: BookOpen,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10"
    },
    {
      title: "Quiz Performance Report",
      description: "Quiz scores, pass rates, and question-level analytics",
      icon: FileBarChart,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10"
    },
    {
      title: "Certificate Report",
      description: "All certificates issued with user details and completion dates",
      icon: Award,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10"
    },
    {
      title: "Monthly Summary",
      description: "Overall platform activity and trends for the current month",
      icon: Calendar,
      color: "text-cyan-500",
      bgColor: "bg-cyan-500/10"
    }
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Reports</h1>
        <p className="text-neutral-400 mt-1">Generate and export analytics reports</p>
      </div>

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
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-neutral-900 border-neutral-800">
        <CardHeader>
          <CardTitle className="text-white">Custom Report</CardTitle>
          <CardDescription className="text-neutral-400">
            Create a custom report with specific date ranges and filters
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="text-sm text-neutral-400 mb-2 block">Start Date</label>
              <input 
                type="date" 
                className="w-full px-4 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-white"
              />
            </div>
            <div className="flex-1">
              <label className="text-sm text-neutral-400 mb-2 block">End Date</label>
              <input 
                type="date" 
                className="w-full px-4 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-white"
              />
            </div>
            <div className="flex items-end">
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                Generate Report
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
