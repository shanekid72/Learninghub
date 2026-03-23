import { NextResponse } from "next/server"
import { requireAdminProfile } from "@/lib/admin-auth"
import { isHrIntegrityEnabled } from "@/lib/hr/feature"
import { reviewHrSessionSchema } from "@/lib/hr/schemas"
import { getHrSessionDetail, reviewHrSession } from "@/lib/hr/server"
import { createAdminClient } from "@/lib/supabase/server"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  if (!isHrIntegrityEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const admin = await requireAdminProfile()
  if (admin.error) return admin.error

  try {
    const { sessionId } = await params
    const supabase = await createAdminClient()
    const session = await getHrSessionDetail(supabase, sessionId)
    if (!session) {
      return NextResponse.json({ error: "HR session not found" }, { status: 404 })
    }

    return NextResponse.json({ session })
  } catch (error) {
    console.error("Error loading HR session detail:", error)
    return NextResponse.json({ error: "Failed to load HR session" }, { status: 500 })
  }
}

export async function PATCH(
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
    const body = await request.json()
    const parsed = reviewHrSessionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid HR review payload", details: parsed.error.issues },
        { status: 400 },
      )
    }

    const supabase = await createAdminClient()
    const session = await reviewHrSession({
      actorProfileId: admin.profile.id,
      reviewNotes: parsed.data.reviewNotes,
      reviewOutcome: parsed.data.reviewOutcome,
      sessionId,
      supabase,
    })

    if (!session) {
      return NextResponse.json({ error: "HR session not found" }, { status: 404 })
    }

    return NextResponse.json({ session })
  } catch (error) {
    console.error("Error reviewing HR session:", error)
    return NextResponse.json({ error: "Failed to review HR session" }, { status: 500 })
  }
}
