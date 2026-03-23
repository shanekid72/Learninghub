"use client"

import Link from "next/link"
import * as React from "react"
import { AlertCircle, Copy, ExternalLink, Loader2, Mail, Plus, ShieldAlert } from "lucide-react"
import type { HrSessionListItem } from "@/lib/hr/view-models"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

type CreateSessionResponse = {
  emailError: string | null
  emailSent: boolean
  inviteUrl: string
  session: HrSessionListItem | null
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Not set"
  return new Date(value).toLocaleString()
}

function statusBadgeClass(status: HrSessionListItem["status"]) {
  if (status === "reviewed") return "bg-sky-900/30 text-sky-300"
  if (status === "completed") return "bg-emerald-900/30 text-emerald-300"
  if (status === "monitoring") return "bg-amber-900/30 text-amber-300"
  if (status === "paired") return "bg-violet-900/30 text-violet-300"
  if (status === "expired") return "bg-red-900/30 text-red-300"
  return "bg-neutral-800 text-neutral-300"
}

function riskBadgeClass(session: HrSessionListItem) {
  const riskLevel = session.latestSummary?.riskLevel || "low"
  if (riskLevel === "high") return "bg-red-900/30 text-red-300"
  if (riskLevel === "medium") return "bg-amber-900/30 text-amber-300"
  return "bg-emerald-900/30 text-emerald-300"
}

export function HrSessionManager() {
  const [sessions, setSessions] = React.useState<HrSessionListItem[]>([])
  const [candidateName, setCandidateName] = React.useState("")
  const [candidateEmail, setCandidateEmail] = React.useState("")
  const [jobTitle, setJobTitle] = React.useState("")
  const [scheduledAt, setScheduledAt] = React.useState("")
  const [sendEmail, setSendEmail] = React.useState(true)
  const [loading, setLoading] = React.useState(true)
  const [submitting, setSubmitting] = React.useState(false)
  const [actionKey, setActionKey] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)

  async function loadSessions() {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/admin/hr/sessions", { cache: "no-store" })
      const payload = (await response.json()) as { error?: string; sessions?: HrSessionListItem[] }
      if (!response.ok) {
        throw new Error(payload.error || "Failed to load HR sessions")
      }

      setSessions(payload.sessions || [])
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load HR sessions")
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    void loadSessions()
  }, [])

  async function copyToClipboard(value: string, message: string) {
    await navigator.clipboard.writeText(value)
    setSuccess(message)
  }

  async function handleCreateSession(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch("/api/admin/hr/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateName,
          candidateEmail,
          jobTitle,
          scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
          sendEmail,
        }),
      })

      const payload = (await response.json()) as CreateSessionResponse & { error?: string }
      if (!response.ok || !payload.inviteUrl) {
        throw new Error(payload.error || "Failed to create HR session")
      }

      setCandidateName("")
      setCandidateEmail("")
      setJobTitle("")
      setScheduledAt("")
      await copyToClipboard(
        payload.inviteUrl,
        payload.emailSent
          ? "HR session created, invite emailed, and fresh link copied."
          : "HR session created and fresh invite link copied.",
      )
      await loadSessions()
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to create HR session")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleInviteAction(sessionId: string, sendEmailInvite: boolean) {
    setActionKey(`${sessionId}:${sendEmailInvite ? "email" : "copy"}`)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch(`/api/admin/hr/sessions/${encodeURIComponent(sessionId)}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sendEmail: sendEmailInvite }),
      })

      const payload = (await response.json()) as {
        emailError?: string | null
        emailSent?: boolean
        error?: string
        inviteUrl?: string
      }

      if (!response.ok || !payload.inviteUrl) {
        throw new Error(payload.error || "Failed to issue invite")
      }

      await navigator.clipboard.writeText(payload.inviteUrl)
      setSuccess(
        sendEmailInvite
          ? payload.emailSent
            ? "Fresh invite emailed and copied."
            : payload.emailError || "Fresh invite copied, but email delivery failed."
          : "Fresh invite copied to clipboard.",
      )
      await loadSessions()
    } catch (inviteError) {
      setError(inviteError instanceof Error ? inviteError.message : "Failed to issue invite")
    } finally {
      setActionKey(null)
    }
  }

  const monitoringCount = sessions.filter((session) => session.status === "monitoring").length
  const flaggedCount = sessions.filter((session) => session.latestSummary?.riskLevel === "high").length

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">HR Integrity</h1>
          <p className="mt-1 text-neutral-400">
            Create interview integrity sessions, issue one-time links, and review scanner summaries.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="border-neutral-700 text-neutral-200 hover:bg-neutral-800"
          onClick={() => void loadSessions()}
        >
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldAlert className="mr-2 h-4 w-4" />}
          Refresh Sessions
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-neutral-800 bg-neutral-900">
          <CardContent className="pt-6">
            <p className="text-sm text-neutral-400">Active Sessions</p>
            <p className="mt-2 text-3xl font-semibold text-white">{sessions.length}</p>
          </CardContent>
        </Card>
        <Card className="border-neutral-800 bg-neutral-900">
          <CardContent className="pt-6">
            <p className="text-sm text-neutral-400">Monitoring Now</p>
            <p className="mt-2 text-3xl font-semibold text-white">{monitoringCount}</p>
          </CardContent>
        </Card>
        <Card className="border-neutral-800 bg-neutral-900">
          <CardContent className="pt-6">
            <p className="text-sm text-neutral-400">High Risk</p>
            <p className="mt-2 text-3xl font-semibold text-white">{flaggedCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-neutral-800 bg-neutral-900">
        <CardHeader>
          <CardTitle className="text-white">Create Interview Session</CardTitle>
          <CardDescription className="text-neutral-400">
            Creating a session issues a fresh one-time link immediately. If email is disabled or delivery fails, copy the link manually.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={handleCreateSession}>
            <Input
              value={candidateName}
              onChange={(event) => setCandidateName(event.target.value)}
              placeholder="Candidate name"
              className="border-neutral-700 bg-neutral-800 text-white"
              required
            />
            <Input
              value={candidateEmail}
              onChange={(event) => setCandidateEmail(event.target.value)}
              placeholder="Candidate email"
              type="email"
              className="border-neutral-700 bg-neutral-800 text-white"
              required
            />
            <Input
              value={jobTitle}
              onChange={(event) => setJobTitle(event.target.value)}
              placeholder="Job title"
              className="border-neutral-700 bg-neutral-800 text-white"
              required
            />
            <Input
              value={scheduledAt}
              onChange={(event) => setScheduledAt(event.target.value)}
              type="datetime-local"
              className="border-neutral-700 bg-neutral-800 text-white"
            />
            <label className="flex items-center gap-3 text-sm text-neutral-300 md:col-span-2">
              <input
                checked={sendEmail}
                onChange={(event) => setSendEmail(event.target.checked)}
                type="checkbox"
              />
              Email the candidate immediately when the session is created
            </label>
            <div className="md:col-span-2">
              <Button type="submit" disabled={submitting} className="bg-emerald-600 text-white hover:bg-emerald-700">
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Create Session
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {error ? (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">
          {success}
        </div>
      ) : null}

      <Card className="border-neutral-800 bg-neutral-900">
        <CardHeader>
          <CardTitle className="text-white">Interview Sessions</CardTitle>
          <CardDescription className="text-neutral-400">
            Review session health, generate fresh links, and open the detailed reviewer timeline.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="rounded-lg border border-dashed border-neutral-800 bg-neutral-950/40 px-6 py-12 text-center">
              <AlertCircle className="mx-auto h-6 w-6 text-neutral-500" />
              <p className="mt-3 text-sm text-neutral-300">No HR sessions yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sessions.map((session) => {
                const disabledInviteActions = ["paired", "monitoring", "completed", "reviewed", "cancelled"].includes(
                  session.status,
                )

                return (
                  <div
                    key={session.id}
                    className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-5"
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold text-white">{session.candidateName}</h3>
                          <Badge variant="secondary" className={statusBadgeClass(session.status)}>
                            {session.status}
                          </Badge>
                          <Badge variant="secondary" className={riskBadgeClass(session)}>
                            risk {session.latestSummary?.riskLevel || "low"}
                          </Badge>
                        </div>
                        <div className="space-y-1 text-sm text-neutral-400">
                          <p>{session.candidateEmail}</p>
                          <p>{session.jobTitle}</p>
                          <p>Scheduled: {formatDate(session.scheduledAt)}</p>
                          <p>
                            Invite:{" "}
                            {session.activeInvite
                              ? `last generated ${formatDate(session.activeInvite.expiresAt)}`
                              : "not issued"}
                          </p>
                        </div>
                        {session.latestSummary ? (
                          <div className="flex flex-wrap gap-2 text-xs text-neutral-300">
                            <span>Displays: {session.latestSummary.displayCount}</span>
                            <span>High-memory: {session.latestSummary.highMemoryCount}</span>
                            <span>Network: {session.latestSummary.networkProcessCount}</span>
                            <span>Suspicious: {session.latestSummary.suspiciousCount}</span>
                          </div>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-2 xl:justify-end">
                        <Button asChild variant="outline" className="border-neutral-700 text-neutral-200 hover:bg-neutral-800">
                          <Link href={`/admin/hr/${session.id}`}>
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Review
                          </Link>
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="border-neutral-700 text-neutral-200 hover:bg-neutral-800"
                          onClick={() => void handleInviteAction(session.id, false)}
                          disabled={disabledInviteActions || actionKey === `${session.id}:copy`}
                        >
                          {actionKey === `${session.id}:copy` ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Copy className="mr-2 h-4 w-4" />
                          )}
                          Copy Fresh Link
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="border-neutral-700 text-neutral-200 hover:bg-neutral-800"
                          onClick={() => void handleInviteAction(session.id, true)}
                          disabled={disabledInviteActions || actionKey === `${session.id}:email`}
                        >
                          {actionKey === `${session.id}:email` ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Mail className="mr-2 h-4 w-4" />
                          )}
                          Resend Email
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
