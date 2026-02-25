import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { CertificateData } from "@/lib/certificate-types"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: certificate, error } = await supabase
      .from('certificates')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !certificate) {
      return NextResponse.json({ error: 'Certificate not found' }, { status: 404 })
    }

    if (certificate.user_id !== user.id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', certificate.user_id)
      .single()

    const certificateData: CertificateData = {
      certificateId: certificate.id,
      userName: profile?.full_name || profile?.email || 'Learner',
      moduleTitle: certificate.module_id,
      completionDate: new Date(certificate.issued_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      issuedAt: certificate.issued_at
    }

    return NextResponse.json(certificateData)
  } catch (error) {
    console.error('Error fetching certificate:', error)
    return NextResponse.json(
      { error: 'Failed to fetch certificate' },
      { status: 500 }
    )
  }
}
