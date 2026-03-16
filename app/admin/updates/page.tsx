"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ModulePicker, type ModulePickerItem } from "@/components/admin/module-picker"
import { Loader2 } from "lucide-react"

type TargetType = "team" | "user" | "all"

type AdminUser = {
  id: string
  email: string
  full_name: string | null
  team: string | null
}

type PublishResponse = {
  success: boolean
  recipients: number
  assignmentStats: { created: number; updated: number }
  emailStats: { sent: number; skipped: number; failed: number }
  emailProviderConfigured: boolean
}

type LearningTeam = {
  id: string
  name: string
  is_active: boolean
  sort_order: number
}

export default function AdminUpdatesPage() {
  const [users, setUsers] = React.useState<AdminUser[]>([])
  const [teams, setTeams] = React.useState<LearningTeam[]>([])
  const [loadingUsers, setLoadingUsers] = React.useState(true)
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [result, setResult] = React.useState<PublishResponse | null>(null)

  const [moduleId, setModuleId] = React.useState("")
  const [moduleTitle, setModuleTitle] = React.useState("")
  const [updateTitle, setUpdateTitle] = React.useState("New Learning Update")
  const [targetType, setTargetType] = React.useState<TargetType>("team")
  const [selectedTeam, setSelectedTeam] = React.useState("")
  const [selectedUserIds, setSelectedUserIds] = React.useState<string[]>([])
  const [dueDate, setDueDate] = React.useState("")
  const [note, setNote] = React.useState("")
  const [sendEmail, setSendEmail] = React.useState(true)

  const teamOptions = React.useMemo(() => {
    const fromTaxonomy = teams.filter((team) => team.is_active).map((team) => team.name)
    const fromUsers = users.map((user) => user.team).filter(Boolean) as string[]
    return [...new Set([...fromTaxonomy, ...fromUsers])].sort((a, b) => a.localeCompare(b))
  }, [teams, users])

  React.useEffect(() => {
    ;(async () => {
      setLoadingUsers(true)
      try {
        const [usersResponse, teamsResponse] = await Promise.all([
          fetch("/api/admin/assignments?includeUsers=1", { cache: "no-store" }),
          fetch("/api/admin/teams", { cache: "no-store" }),
        ])
        if (!usersResponse.ok) {
          throw new Error("Failed to load users")
        }
        if (!teamsResponse.ok) {
          throw new Error("Failed to load teams")
        }
        const payload = (await usersResponse.json()) as { users?: AdminUser[] }
        const teamsPayload = (await teamsResponse.json()) as { teams?: LearningTeam[] }
        setUsers(payload.users || [])
        setTeams(teamsPayload.teams || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load users")
      } finally {
        setLoadingUsers(false)
      }
    })()
  }, [])

  React.useEffect(() => {
    if (!selectedTeam && teamOptions.length > 0) {
      setSelectedTeam(teamOptions[0])
    }
  }, [selectedTeam, teamOptions])

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds((previous) =>
      previous.includes(userId)
        ? previous.filter((id) => id !== userId)
        : [...previous, userId],
    )
  }

  const handlePublish = async () => {
    if (!moduleId.trim() || !moduleTitle.trim()) {
      setError("Please select a module")
      return
    }
    if (targetType === "team" && !selectedTeam) {
      setError("Please select a team")
      return
    }
    if (targetType === "user" && selectedUserIds.length === 0) {
      setError("Select at least one user")
      return
    }

    setSubmitting(true)
    setError(null)
    setResult(null)
    try {
      const response = await fetch("/api/admin/updates/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleId: moduleId.trim(),
          moduleTitle: moduleTitle.trim(),
          updateTitle: updateTitle.trim() || "New Learning Update",
          targetType,
          team: targetType === "team" ? selectedTeam : undefined,
          userIds: targetType === "user" ? selectedUserIds : undefined,
          dueDate: dueDate || undefined,
          note: note.trim() || undefined,
          sendEmail,
        }),
      })

      const payload = (await response.json()) as PublishResponse & { error?: string }
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "Failed to publish update")
      }

      setResult(payload)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to publish update")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Updates</h1>
        <p className="text-neutral-400 mt-1">
          Publish refresher updates and push assignment plus email in one flow
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <Card className="bg-neutral-900 border-neutral-800">
        <CardHeader>
          <CardTitle className="text-white">Publish Update</CardTitle>
          <CardDescription className="text-neutral-400">
            Creates assignments and optionally emails learners
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm text-neutral-400">Module</label>
              <ModulePicker
                value={moduleId}
                onSelect={(module: ModulePickerItem) => {
                  setModuleId(module.moduleId)
                  setModuleTitle(module.title)
                }}
                disabled={submitting}
                placeholder="Search published modules"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm text-neutral-400">Module Title</label>
              <Input
                value={moduleTitle}
                readOnly
                className="bg-neutral-800 border-neutral-700 text-white"
                placeholder="Selected automatically from the module catalog"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm text-neutral-400">Update Title</label>
              <Input
                value={updateTitle}
                onChange={(event) => setUpdateTitle(event.target.value)}
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

          <div>
            <label className="mb-2 block text-sm text-neutral-400">Audience Type</label>
            <select
              value={targetType}
              onChange={(event) => setTargetType(event.target.value as TargetType)}
              className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-white"
            >
              <option value="team">Single Team</option>
              <option value="user">Specific Users</option>
              <option value="all">All Learners</option>
            </select>
          </div>

          {targetType === "team" && (
            <div>
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
          )}

          {targetType === "user" && (
            <div>
              <label className="mb-2 block text-sm text-neutral-400">Users</label>
              {loadingUsers ? (
                <div className="flex items-center gap-2 text-sm text-neutral-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading users...
                </div>
              ) : (
                <div className="max-h-56 space-y-2 overflow-y-auto rounded-md border border-neutral-800 bg-neutral-950/40 p-3">
                  {users.map((user) => (
                    <label key={user.id} className="flex items-center gap-3 text-sm text-neutral-200">
                      <input
                        type="checkbox"
                        checked={selectedUserIds.includes(user.id)}
                        onChange={() => toggleUserSelection(user.id)}
                      />
                      <span>{user.full_name || user.email}</span>
                      <span className="text-neutral-500">{user.team ? `(${user.team})` : ""}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm text-neutral-400">Note (optional)</label>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className="min-h-[90px] w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-white"
              placeholder="Add context for learners..."
            />
          </div>

          <label className="flex items-center gap-3 text-sm text-neutral-200">
            <input
              type="checkbox"
              checked={sendEmail}
              onChange={(event) => setSendEmail(event.target.checked)}
            />
            Send update email notification
          </label>

          <Button
            onClick={handlePublish}
            disabled={submitting}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Publish Update
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card className="bg-neutral-900 border-neutral-800">
          <CardHeader>
            <CardTitle className="text-white">Publish Result</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-neutral-300">
            <p>Recipients targeted: {result.recipients}</p>
            <p>Assignments created: {result.assignmentStats.created}</p>
            <p>Assignments updated: {result.assignmentStats.updated}</p>
            <p>Email sent: {result.emailStats.sent}</p>
            <p>Email skipped: {result.emailStats.skipped}</p>
            <p>Email failed: {result.emailStats.failed}</p>
            <p>Email provider configured: {String(result.emailProviderConfigured)}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
