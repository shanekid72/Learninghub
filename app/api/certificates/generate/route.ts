import { NextResponse } from "next/server"
import { getSessionContext } from "@/lib/app-session"
import { createAdminClient } from "@/lib/supabase/server"
import { z } from "zod"
import { CertificateData } from "@/lib/certificate-types"
import { checkRateLimit, getRateLimitResponse, getClientIP } from "@/lib/rate-limit"

const generateSchema = z.object({
  moduleId: z.string(),
  moduleTitle: z.string()
})

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null
  const clean = value.trim().toLowerCase()
  return clean && clean.includes("@") ? clean : null
}

export async function POST(request: Request) {
  try {
    const clientIP = getClientIP(request)
    const rateLimitResult = checkRateLimit(clientIP, '/api/certificates/generate')
    
    if (!rateLimitResult.success) {
      return getRateLimitResponse(rateLimitResult.resetIn)
    }

    const body = await request.json()
    
    const validation = generateSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.issues },
        { status: 400 }
      )
    }

    const session = await getSessionContext()
    if (!session?.profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { moduleId, moduleTitle } = validation.data
    const supabase = await createAdminClient()

    const userName = session.profile.fullName || session.profile.email || 'Learner'

    const { data: module, error: moduleError } = await supabase
      .from("learning_modules")
      .select("module_id, title, quiz_mode")
      .eq("module_id", moduleId)
      .maybeSingle()

    if (moduleError) {
      throw moduleError
    }

    if (!module) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 })
    }

    if (module.quiz_mode !== "internal") {
      return NextResponse.json(
        { error: "Certificates are available only for modules with an internal quiz" },
        { status: 403 },
      )
    }

    const { data: completionEvents, error: completionError } = await supabase
      .from("analytics_events")
      .select("user_id, metadata")
      .eq("event_type", "module_complete")
      .eq("module_id", moduleId)

    if (completionError) {
      throw completionError
    }

    const hasCompletion = (completionEvents || []).some((row) => {
      const metadata =
        row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
          ? (row.metadata as Record<string, unknown>)
          : null

      return (
        (session.profile?.id && row.user_id === session.profile.id) ||
        normalizeEmail(metadata?.email) === session.email
      )
    })

    if (!hasCompletion) {
      return NextResponse.json(
        { error: "Complete the module before generating a certificate" },
        { status: 403 },
      )
    }

    const { data: quiz, error: quizError } = await supabase
      .from("quizzes")
      .select("id")
      .eq("module_id", moduleId)
      .maybeSingle()

    if (quizError) {
      throw quizError
    }

    if (!quiz) {
      return NextResponse.json({ error: "Internal quiz not found" }, { status: 404 })
    }

    const { data: passedAttempt, error: passedAttemptError } = await supabase
      .from("quiz_attempts")
      .select("id")
      .eq("quiz_id", quiz.id)
      .eq("user_id", session.profile.id)
      .eq("passed", true)
      .limit(1)
      .maybeSingle()

    if (passedAttemptError && passedAttemptError.code !== "PGRST116") {
      throw passedAttemptError
    }

    if (!passedAttempt) {
      return NextResponse.json(
        { error: "Pass the internal quiz before generating a certificate" },
        { status: 403 },
      )
    }

    const { data: existingCert } = await supabase
      .from('certificates')
      .select('*')
      .eq('user_id', session.profile.id)
      .eq('module_id', moduleId)
      .single()

    if (existingCert) {
      const issuedAt = existingCert.issued_at || new Date().toISOString()
      const certificateData: CertificateData = {
        certificateId: existingCert.id,
        userName,
        moduleTitle: module.title || moduleTitle,
        completionDate: new Date(issuedAt).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        issuedAt
      }
      return NextResponse.json(certificateData)
    }

    const { data: newCert, error: insertError } = await supabase
      .from('certificates')
      .insert({
        user_id: session.profile.id,
        module_id: moduleId
      })
      .select()
      .single()

    if (insertError) {
      throw insertError
    }

    const issuedAt = newCert.issued_at || new Date().toISOString()
    const certificateData: CertificateData = {
      certificateId: newCert.id,
      userName,
      moduleTitle: module.title || moduleTitle,
      completionDate: new Date(issuedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      issuedAt
    }

    return NextResponse.json(certificateData)
  } catch (error) {
    console.error('Error generating certificate:', error)
    return NextResponse.json(
      { error: 'Failed to generate certificate' },
      { status: 500 }
    )
  }
}
