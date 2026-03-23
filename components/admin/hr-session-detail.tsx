"use client"

import Link from "next/link"
import * as React from "react"
import { ArrowLeft, Copy, Loader2, Mail, RefreshCw } from "lucide-react"
import type { HrSessionDetail } from "@/lib/hr/view-models"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"

function formatDate(value: string | null | undefined) {
  if (!value) return "Not set"
  return new Date(value).toLocaleString()
}

function statusBadgeClass(status: HrSessionDetail["status"]) {
  if (status === "reviewed") return "bg-sky-900/30 text-sky-300"
  if (status === "completed") return "bg-emerald-900/30 text-emerald-300"
  if (status === "monitoring") return "bg-amber-900/30 text-amber-300"
  if (status === "paired") return "bg-violet-900/30 text-violet-300"
  if (status === "expired") return "bg-red-900/30 text-red-300"
  return "bg-neutral-800 text-neutral-300"
}

function riskBadgeClass(riskLevel: string | undefined) {
  if (riskLevel === "high") return "bg-red-900/30 text-red-300"
  if (riskLevel === "medium") return "bg-amber-900/30 text-amber-300"
  return "bg-emerald-900/30 text-emerald-300"
}

export function HrSessionDetailView({ sessionId }: { sessionId: string }) {
  const [session, setSession] = React.useState<HrSessionDetail | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)
  const [reviewOutcome, setReviewOutcome] = React.useState("pending")
  const [reviewNotes, setReviewNotes] = React.useState("")
  const [savingReview, setSavingReview] = React.useState(false)
  const [inviteAction, setInviteAction] = React.useState<string | null>(null)

  const loadSession = React.useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/hr/sessions/${encodeURIComponent(sessionId)}`, {
        cache: "no-store",
      })
      const payload = (await response.json()) as { error?: string; session?: HrSessionDetail }
      if (!response.ok || !payload.session) {
        throw new Error(payload.error || "Failed to load HR session")
      }

      setSession(payload.session)
      setReviewOutcome(payload.session.reviewOutcome)
      setReviewNotes(payload.session.reviewNotes || "")
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load HR session")
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  React.useEffect(() => {
    void loadSession()
  }, [loadSession])

  React.useEffect(() => {
    if (!session || !["paired", "monitoring"].includes(session.status)) {
      return
    }

    const timer = window.setInterval(() => {
      void loadSession()
    }, 10_000)

    return () => window.clearInterval(timer)
  }, [loadSession, session])

  async function handleReviewSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSavingReview(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch(`/api/admin/hr/sessions/${encodeURIComponent(sessionId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewOutcome,
          reviewNotes,
        }),
      })

      const payload = (await response.json()) as { error?: string; session?: HrSessionDetail }
      if (!response.ok || !payload.session) {
        throw new Error(payload.error || "Failed to save review")
      }

      setSession(payload.session)
      setSuccess("Reviewer verdict saved.")
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : "Failed to save review")
    } finally {
      setSavingReview(false)
    }
  }

  async function handleInviteAction(sendEmail: boolean) {
    setInviteAction(sendEmail ? "email" : "copy")
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch(`/api/admin/hr/sessions/${encodeURIComponent(sessionId)}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sendEmail }),
      })

      const payload = (await response.json()) as {
        emailError?: string | null
        emailSent?: boolean
        error?: string
        inviteUrl?: string
        session?: HrSessionDetail
      }

      if (!response.ok || !payload.inviteUrl) {
        throw new Error(payload.error || "Failed to issue invite")
      }

      await navigator.clipboard.writeText(payload.inviteUrl)
      if (payload.session) {
        setSession(payload.session)
      }
      setSuccess(
        sendEmail
          ? payload.emailSent
            ? "Fresh invite emailed and copied."
            : payload.emailError || "Fresh invite copied, but email delivery failed."
          : "Fresh invite copied to clipboard.",
      )
    } catch (inviteError) {
      setError(inviteError instanceof Error ? inviteError.message : "Failed to issue invite")
    } finally {
      setInviteAction(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
      </div>
    )
  }

  if (error && !session) {
    return (
      <div className="space-y-4">
        <Button asChild variant="outline" className="border-neutral-700 text-neutral-200 hover:bg-neutral-800">
          <Link href="/admin/hr">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to HR
          </Link>
        </Button>
        <div className="rounded-md border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  const disableInviteActions = ["paired", "monitoring", "completed", "reviewed", "cancelled"].includes(
    session.status,
  )

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Button asChild variant="outline" className="mb-4 border-neutral-700 text-neutral-200 hover:bg-neutral-800">
            <Link href="/admin/hr">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to HR
            </Link>
          </Button>
          <h1 className="text-3xl font-bold text-white">{session.candidateName}</h1>
          <p className="mt-1 text-neutral-400">
            {session.jobTitle} • {session.candidateEmail}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className={statusBadgeClass(session.status)}>
            {session.status}
          </Badge>
          <Badge variant="secondary" className={riskBadgeClass(session.latestSummary?.riskLevel)}>
            risk {session.latestSummary?.riskLevel || "low"}
          </Badge>
          <Button
            type="button"
            variant="outline"
            className="border-neutral-700 text-neutral-200 hover:bg-neutral-800"
            onClick={() => void loadSession()}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

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

      <div className="grid gap-4 xl:grid-cols-4">
        <Card className="border-neutral-800 bg-neutral-900 xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-white">Session Status</CardTitle>
            <CardDescription className="text-neutral-400">
              Pairing and monitoring milestones for this interview session.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm text-neutral-300 md:grid-cols-2">
            <p>Scheduled: {formatDate(session.scheduledAt)}</p>
            <p>Invite expires: {formatDate(session.activeInvite?.expiresAt)}</p>
            <p>Paired: {formatDate(session.pairedAt)}</p>
            <p>Monitoring started: {formatDate(session.monitoringStartedAt)}</p>
            <p>Completed: {formatDate(session.completedAt)}</p>
            <p>Reviewed: {formatDate(session.reviewedAt)}</p>
          </CardContent>
        </Card>
        <Card className="border-neutral-800 bg-neutral-900">
          <CardHeader>
            <CardTitle className="text-white">Invite Tools</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              type="button"
              variant="outline"
              className="w-full border-neutral-700 text-neutral-200 hover:bg-neutral-800"
              onClick={() => void handleInviteAction(false)}
              disabled={disableInviteActions || inviteAction === "copy"}
            >
              {inviteAction === "copy" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Copy className="mr-2 h-4 w-4" />
              )}
              Copy Fresh Link
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full border-neutral-700 text-neutral-200 hover:bg-neutral-800"
              onClick={() => void handleInviteAction(true)}
              disabled={disableInviteActions || inviteAction === "email"}
            >
              {inviteAction === "email" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Mail className="mr-2 h-4 w-4" />
              )}
              Resend Email
            </Button>
          </CardContent>
        </Card>
        <Card className="border-neutral-800 bg-neutral-900">
          <CardHeader>
            <CardTitle className="text-white">Latest Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-neutral-300">
            {session.latestSummary ? (
              <>
                <p>Displays: {session.latestSummary.displayCount}</p>
                <p>High-memory: {session.latestSummary.highMemoryCount}</p>
                <p>Network processes: {session.latestSummary.networkProcessCount}</p>
                <p>Suspicious processes: {session.latestSummary.suspiciousCount}</p>
                <p>Interview Coder: {session.latestSummary.interviewCoderDetected ? "Detected" : "Not detected"}</p>
                <p>Scanner: {session.latestSummary.scannerVersion}</p>
                <p>Platform: {session.latestSummary.platform}</p>
              </>
            ) : (
              <p className="text-neutral-500">No scanner data uploaded yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="border-neutral-800 bg-neutral-900">
          <CardHeader>
            <CardTitle className="text-white">Reviewer Verdict</CardTitle>
            <CardDescription className="text-neutral-400">
              Save the final HR decision and notes for the audit trail.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleReviewSubmit}>
              <select
                value={reviewOutcome}
                onChange={(event) => setReviewOutcome(event.target.value)}
                className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-white"
              >
                <option value="pending">Pending</option>
                <option value="clear">Clear</option>
                <option value="flagged">Flagged</option>
                <option value="follow_up">Follow Up</option>
              </select>
              <Textarea
                value={reviewNotes}
                onChange={(event) => setReviewNotes(event.target.value)}
                placeholder="Add reviewer notes"
                className="border-neutral-700 bg-neutral-800 text-white"
              />
              <Button type="submit" disabled={savingReview} className="bg-emerald-600 text-white hover:bg-emerald-700">
                {savingReview ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save Review
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-neutral-800 bg-neutral-900">
          <CardHeader>
            <CardTitle className="text-white">Event Timeline</CardTitle>
            <CardDescription className="text-neutral-400">
              Appended milestones from invite issue through final review.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {session.events.length === 0 ? (
              <p className="text-sm text-neutral-500">No events recorded yet.</p>
            ) : (
              session.events.map((event) => (
                <div key={event.id} className="rounded-lg border border-neutral-800 bg-neutral-950/60 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Badge variant="secondary" className="bg-neutral-800 text-neutral-200">
                      {event.eventType}
                    </Badge>
                    <span className="text-xs text-neutral-500">{formatDate(event.createdAt)}</span>
                  </div>
                  {event.summary ? (
                    <div className="mt-3 grid gap-1 text-sm text-neutral-300 md:grid-cols-2">
                      <span>Risk: {event.summary.riskLevel}</span>
                      <span>Displays: {event.summary.displayCount}</span>
                      <span>High-memory: {event.summary.highMemoryCount}</span>
                      <span>Network: {event.summary.networkProcessCount}</span>
                      <span>Suspicious: {event.summary.suspiciousCount}</span>
                      <span>Interview Coder: {event.summary.interviewCoderDetected ? "Detected" : "Not detected"}</span>
                    </div>
                  ) : (
                    <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-xs text-neutral-400">
                      {JSON.stringify(event.payload, null, 2)}
                    </pre>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
