import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { z } from "zod"
import { CertificateData } from "@/lib/certificate-types"
import { checkRateLimit, getRateLimitResponse, getClientIP } from "@/lib/rate-limit"

const generateSchema = z.object({
  moduleId: z.string(),
  moduleTitle: z.string()
})

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

    const { moduleId, moduleTitle } = validation.data
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single()

    const userName = profile?.full_name || profile?.email || user.email || 'Learner'

    const { data: existingCert } = await supabase
      .from('certificates')
      .select('*')
      .eq('user_id', user.id)
      .eq('module_id', moduleId)
      .single()

    if (existingCert) {
      const certificateData: CertificateData = {
        certificateId: existingCert.id,
        userName,
        moduleTitle,
        completionDate: new Date(existingCert.issued_at).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        issuedAt: existingCert.issued_at
      }
      return NextResponse.json(certificateData)
    }

    const { data: newCert, error: insertError } = await supabase
      .from('certificates')
      .insert({
        user_id: user.id,
        module_id: moduleId
      })
      .select()
      .single()

    if (insertError) {
      throw insertError
    }

    const certificateData: CertificateData = {
      certificateId: newCert.id,
      userName,
      moduleTitle,
      completionDate: new Date(newCert.issued_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      issuedAt: newCert.issued_at
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
