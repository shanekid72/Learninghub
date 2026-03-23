import { NextResponse } from "next/server"
import { requireAdminProfile } from "@/lib/admin-auth"
import { isHrIntegrityEnabled } from "@/lib/hr/feature"
import { issueHrInviteSchema } from "@/lib/hr/schemas"
import { getHrSessionDetail, issueHrInvite } from "@/lib/hr/server"
import { createAdminClient } from "@/lib/supabase/server"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  if (!isHrIntegrityEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const admin = await requireAdminProfile()
  if (admin.error) return admin.error

  try {
    const { sessionId } = await params
    const body = await request.json().catch(() => ({}))
    const parsed = issueHrInviteSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid HR invite payload", details: parsed.error.issues },
        { status: 400 },
      )
    }

    const supabase = await createAdminClient()
    const session = await getHrSessionDetail(supabase, sessionId)
    if (!session) {
      return NextResponse.json({ error: "HR session not found" }, { status: 404 })
    }

    if (["paired", "monitoring", "completed", "reviewed", "cancelled"].includes(session.status)) {
      return NextResponse.json(
        { error: `Cannot issue a new invite while session status is ${session.status}` },
        { status: 409 },
      )
    }

    const { error: statusError } = await supabase
      .from("hr_sessions")
      .update({ status: "invited" })
      .eq("id", sessionId)

    if (statusError) {
      throw statusError
    }

    const invite = await issueHrInvite({
      actorProfileId: admin.profile.id,
      candidateEmail: session.candidateEmail,
      candidateName: session.candidateName,
      jobTitle: session.jobTitle,
      requestUrl: request.url,
      sendEmail: parsed.data.sendEmail,
      sessionId,
      supabase,
    })

    const detail = await getHrSessionDetail(supabase, sessionId)

    return NextResponse.json({
      session: detail,
      inviteUrl: invite.inviteUrl,
      emailSent: invite.emailSent,
      emailError: invite.emailError,
    })
  } catch (error) {
    console.error("Error issuing HR invite:", error)
    return NextResponse.json({ error: "Failed to issue HR invite" }, { status: 500 })
  }
}
