"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"
import { teams as defaultTeams } from "@/lib/learning-data"

type AssignmentTargetType = "user" | "team"

type AdminUser = {
  id: string
  email: string
  full_name: string | null
  team: string | null
}

type Assignment = {
  id: string
  module_source: string
  module_id: string
  user_id: string | null
  team: string | null
  due_date: string | null
  is_active: boolean
  created_at: string
  targetType: AssignmentTargetType
  user: AdminUser | null
}

type AssignmentsPayload = {
  assignments: Assignment[]
  users: AdminUser[]
}

export default function AdminAssignmentsPage() {
  const [assignments, setAssignments] = React.useState<Assignment[]>([])
  const [users, setUsers] = React.useState<AdminUser[]>([])
  const [loading, setLoading] = React.useState(true)
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const [moduleId, setModuleId] = React.useState("")
  const [targetType, setTargetType] = React.useState<AssignmentTargetType>("team")
  const [selectedUserId, setSelectedUserId] = React.useState("")
  const [selectedTeam, setSelectedTeam] = React.useState(defaultTeams[0] || "")
  const [dueDate, setDueDate] = React.useState("")

  const teamOptions = React.useMemo(() => {
    const fromUsers = users.map((user) => user.team).filter(Boolean) as string[]
    return [...new Set([...defaultTeams, ...fromUsers])].sort((a, b) => a.localeCompare(b))
  }, [users])

  const loadData = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/admin/assignments?includeUsers=1", { cache: "no-store" })
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.error || "Failed to load assignments")
      }

      const payload = (await response.json()) as AssignmentsPayload
      setAssignments(payload.assignments || [])
      setUsers(payload.users || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load assignments")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    loadData()
  }, [loadData])

  const handleCreate = async () => {
    if (!moduleId.trim()) {
      setError("Module ID is required")
      return
    }
    if (targetType === "user" && !selectedUserId) {
      setError("Please select a user")
      return
    }
    if (targetType === "team" && !selectedTeam) {
      setError("Please select a team")
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const response = await fetch("/api/admin/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleId: moduleId.trim(),
          moduleSource: "lh",
          targetType,
          userId: targetType === "user" ? selectedUserId : undefined,
          team: targetType === "team" ? selectedTeam : undefined,
          dueDate: dueDate || undefined,
        }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.error || "Failed to create assignment")
      }

      setModuleId("")
      setDueDate("")
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create assignment")
    } finally {
      setSubmitting(false)
    }
  }

  const toggleAssignment = async (assignment: Assignment) => {
    try {
      const response = await fetch(`/api/admin/assignments/${assignment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !assignment.is_active }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.error || "Failed to update assignment")
      }

      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update assignment")
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Assignments</h1>
        <p className="text-neutral-400 mt-1">Assign modules to teams or individual learners</p>
      </div>

      {error && (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <Card className="bg-neutral-900 border-neutral-800">
        <CardHeader>
          <CardTitle className="text-white">Create Assignment</CardTitle>
          <CardDescription className="text-neutral-400">
            Link a module to a target audience and optional due date
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm text-neutral-400">Module ID</label>
              <Input
                value={moduleId}
                onChange={(event) => setModuleId(event.target.value)}
                placeholder="e.g. onboarding-day-1"
                className="bg-neutral-800 border-neutral-700 text-white"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm text-neutral-400">Due Date (optional)</label>
              <Input
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                className="bg-neutral-800 border-neutral-700 text-white"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm text-neutral-400">Target Type</label>
              <select
                value={targetType}
                onChange={(event) => setTargetType(event.target.value as AssignmentTargetType)}
                className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-white"
              >
                <option value="team">Team</option>
                <option value="user">User</option>
              </select>
            </div>

            {targetType === "team" ? (
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm text-neutral-400">Team</label>
                <select
                  value={selectedTeam}
                  onChange={(event) => setSelectedTeam(event.target.value)}
                  className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-white"
                >
                  {teamOptions.map((team) => (
                    <option key={team} value={team}>
                      {team}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm text-neutral-400">User</label>
                <select
                  value={selectedUserId}
                  onChange={(event) => setSelectedUserId(event.target.value)}
                  className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-white"
                >
                  <option value="">Select a user</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {(user.full_name || user.email) + (user.team ? ` (${user.team})` : "")}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div>
            <Button
              onClick={handleCreate}
              disabled={submitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create Assignment
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-neutral-900 border-neutral-800">
        <CardHeader>
          <CardTitle className="text-white">Active Assignments</CardTitle>
          <CardDescription className="text-neutral-400">
            Current module targeting configuration
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
            </div>
          ) : assignments.length === 0 ? (
            <p className="py-8 text-center text-sm text-neutral-400">No assignments yet</p>
          ) : (
            <div className="space-y-3">
              {assignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="flex flex-col gap-3 rounded-lg border border-neutral-800 bg-neutral-950/50 p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-white">{assignment.module_id}</p>
                    <p className="text-xs text-neutral-400">
                      {assignment.targetType === "user"
                        ? `User: ${assignment.user?.full_name || assignment.user?.email || assignment.user_id}`
                        : `Team: ${assignment.team}`}
                    </p>
                    <p className="text-xs text-neutral-500">
                      Due: {assignment.due_date || "Not set"}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge
                      variant="secondary"
                      className={
                        assignment.is_active
                          ? "bg-emerald-900/40 text-emerald-300"
                          : "bg-neutral-800 text-neutral-400"
                      }
                    >
                      {assignment.is_active ? "Active" : "Inactive"}
                    </Badge>
                    <Button
                      variant="outline"
                      className="border-neutral-700 text-neutral-200 hover:bg-neutral-800"
                      onClick={() => toggleAssignment(assignment)}
                    >
                      {assignment.is_active ? "Deactivate" : "Reactivate"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
