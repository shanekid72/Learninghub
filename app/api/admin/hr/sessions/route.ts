import { NextResponse } from "next/server"
import { requireAdminProfile } from "@/lib/admin-auth"
import { isHrIntegrityEnabled } from "@/lib/hr/feature"
import { createHrSessionSchema } from "@/lib/hr/schemas"
import { getHrSessionDetail, issueHrInvite, listHrSessions } from "@/lib/hr/server"
import { createAdminClient } from "@/lib/supabase/server"

export async function GET() {
  if (!isHrIntegrityEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const admin = await requireAdminProfile()
  if (admin.error) return admin.error

  try {
    const supabase = await createAdminClient()
    const sessions = await listHrSessions(supabase)
    return NextResponse.json({ sessions })
  } catch (error) {
    console.error("Error listing HR sessions:", error)
    return NextResponse.json({ error: "Failed to load HR sessions" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  if (!isHrIntegrityEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const admin = await requireAdminProfile()
  if (admin.error) return admin.error

  try {
    const body = await request.json()
    const parsed = createHrSessionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid HR session payload", details: parsed.error.issues },
        { status: 400 },
      )
    }

    const supabase = await createAdminClient()
    const payload = parsed.data

    const { data: session, error: sessionError } = await supabase
      .from("hr_sessions")
      .insert({
        candidate_name: payload.candidateName,
        candidate_email: payload.candidateEmail,
        job_title: payload.jobTitle,
        scheduled_at: payload.scheduledAt || null,
        status: "invited",
        created_by: admin.profile.id,
      })
      .select("*")
      .single()

    if (sessionError) {
      throw sessionError
    }

    const invite = await issueHrInvite({
      actorProfileId: admin.profile.id,
      candidateEmail: payload.candidateEmail,
      candidateName: payload.candidateName,
      jobTitle: payload.jobTitle,
      requestUrl: request.url,
      sendEmail: payload.sendEmail,
      sessionId: session.id,
      supabase,
    })

    const detail = await getHrSessionDetail(supabase, session.id)

    return NextResponse.json(
      {
        session: detail,
        inviteUrl: invite.inviteUrl,
        emailSent: invite.emailSent,
        emailError: invite.emailError,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Error creating HR session:", error)
    return NextResponse.json({ error: "Failed to create HR session" }, { status: 500 })
  }
}
