"use client"

import * as React from "react"
import { AlertCircle, Copy, ExternalLink, Loader2 } from "lucide-react"
import type { HrInviteValidationResult } from "@/lib/hr/view-models"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

function formatDate(value: string | null | undefined) {
  if (!value) return "Not set"
  return new Date(value).toLocaleString()
}

function messageForReason(reason: HrInviteValidationResult["reason"]) {
  if (reason === "expired") return "This session link has expired. Contact your recruiter for a fresh invite."
  if (reason === "paired") return "This session has already been paired. Reopen the scanner if you need to reconnect."
  if (reason === "completed") return "This session has already been completed."
  if (reason === "reviewed") return "This session has already been reviewed."
  if (reason === "revoked") return "This session link has been revoked. Contact your recruiter."
  return "This session link is invalid."
}

export function HrInterviewAccess({
  scannerProtocol,
  token,
}: {
  scannerProtocol: string
  token: string
}) {
  const [result, setResult] = React.useState<HrInviteValidationResult | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [copyMessage, setCopyMessage] = React.useState<string | null>(null)

  React.useEffect(() => {
    let mounted = true

    async function loadInviteState() {
      setLoading(true)

      try {
        const response = await fetch("/api/hr/invite/validate", {
          method: "POST",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        })
        const payload = (await response.json()) as HrInviteValidationResult
        if (mounted) {
          setResult(payload)
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    void loadInviteState()

    return () => {
      mounted = false
    }
  }, [token])

  async function copyCurrentLink() {
    await navigator.clipboard.writeText(window.location.href)
    setCopyMessage("Session link copied.")
  }

  const launchUrl =
    typeof window === "undefined"
      ? ""
      : `${scannerProtocol}://pair?sessionLink=${encodeURIComponent(window.location.href)}`

  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-4xl font-bold">Interview Integrity Session</h1>
          <p className="text-neutral-400">
            Open the Windows scanner, pair it to this session, and keep it running throughout the interview.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
          </div>
        ) : result?.session ? (
          <>
            <Card className="border-neutral-800 bg-neutral-900">
              <CardHeader>
                <CardTitle className="text-white">{result.session.jobTitle}</CardTitle>
                <CardDescription className="text-neutral-400">
                  Candidate: {result.session.candidateName}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-neutral-300">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="bg-neutral-800 text-neutral-200">
                    {result.reason}
                  </Badge>
                  {result.session.inviteExpiresAt ? (
                    <Badge variant="secondary" className="bg-neutral-800 text-neutral-200">
                      invite expires {formatDate(result.session.inviteExpiresAt)}
                    </Badge>
                  ) : null}
                </div>
                <p>Scheduled interview time: {formatDate(result.session.scheduledAt)}</p>
                <p>{result.valid ? "Use the button below to open the scanner." : messageForReason(result.reason)}</p>
              </CardContent>
            </Card>

            <Card className="border-neutral-800 bg-neutral-900">
              <CardHeader>
                <CardTitle className="text-white">Launch Scanner</CardTitle>
                <CardDescription className="text-neutral-400">
                  The scanner uses this page URL for pairing, so reopening it will reconnect you to the same session.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 sm:flex-row">
                <Button asChild className="bg-emerald-600 text-white hover:bg-emerald-700">
                  <a href={launchUrl}>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open Scanner
                  </a>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="border-neutral-700 text-neutral-200 hover:bg-neutral-800"
                  onClick={() => void copyCurrentLink()}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Session Link
                </Button>
              </CardContent>
            </Card>

            <Card className="border-neutral-800 bg-neutral-900">
              <CardHeader>
                <CardTitle className="text-white">Manual Fallback</CardTitle>
                <CardDescription className="text-neutral-400">
                  If the scanner does not open automatically, launch it yourself and paste this full page link into the pairing field.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border border-neutral-800 bg-neutral-950/70 p-4 text-sm text-neutral-300">
                  <p className="break-all">{typeof window === "undefined" ? "" : window.location.href}</p>
                </div>
                {copyMessage ? <p className="mt-3 text-sm text-emerald-300">{copyMessage}</p> : null}
              </CardContent>
            </Card>
          </>
        ) : (
          <Card className="border-red-500/30 bg-red-500/10">
            <CardContent className="flex items-center gap-3 py-6 text-red-200">
              <AlertCircle className="h-5 w-5" />
              <p>{result ? messageForReason(result.reason) : "This session link is invalid."}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  )
}
