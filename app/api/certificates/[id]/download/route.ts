import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

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

    const userName = profile?.full_name || profile?.email || 'Learner'
    const completionDate = new Date(certificate.issued_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    const svg = generateCertificateSVG({
      certificateId: certificate.id,
      userName,
      moduleTitle: certificate.module_id,
      completionDate,
    })

    return new NextResponse(svg, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Content-Disposition': `attachment; filename="certificate-${certificate.id.slice(0, 8)}.svg"`,
      },
    })
  } catch (error) {
    console.error('Error downloading certificate:', error)
    return NextResponse.json(
      { error: 'Failed to download certificate' },
      { status: 500 }
    )
  }
}

interface CertificateParams {
  certificateId: string
  userName: string
  moduleTitle: string
  completionDate: string
}

function generateCertificateSVG({ certificateId, userName, moduleTitle, completionDate }: CertificateParams): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1e293b"/>
      <stop offset="50%" style="stop-color:#0f172a"/>
      <stop offset="100%" style="stop-color:#1e293b"/>
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#d97706"/>
      <stop offset="50%" style="stop-color:#fbbf24"/>
      <stop offset="100%" style="stop-color:#d97706"/>
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="800" height="600" fill="url(#bgGrad)"/>
  
  <!-- Border -->
  <rect x="20" y="20" width="760" height="560" fill="none" stroke="#f59e0b" stroke-width="2" opacity="0.3" rx="8"/>
  <rect x="30" y="30" width="740" height="540" fill="none" stroke="#f59e0b" stroke-width="1" opacity="0.2" rx="6"/>
  
  <!-- Header -->
  <text x="400" y="80" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#f59e0b" letter-spacing="8">LEARNING HUB</text>
  <text x="400" y="130" text-anchor="middle" font-family="Georgia, serif" font-size="36" fill="white" font-weight="bold">Certificate of Completion</text>
  
  <!-- Content -->
  <text x="400" y="200" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#94a3b8">This is to certify that</text>
  
  <text x="400" y="260" text-anchor="middle" font-family="Georgia, serif" font-size="32" fill="url(#goldGrad)" font-weight="bold">${escapeXml(userName)}</text>
  <line x1="200" y1="275" x2="600" y2="275" stroke="#f59e0b" stroke-width="1" opacity="0.5"/>
  
  <text x="400" y="320" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#94a3b8">has successfully completed</text>
  
  <text x="400" y="370" text-anchor="middle" font-family="Georgia, serif" font-size="24" fill="white" font-weight="bold">${escapeXml(moduleTitle)}</text>
  
  <!-- Checkmark -->
  <circle cx="400" cy="430" r="20" fill="#10b981" opacity="0.2"/>
  <path d="M390 430 L397 437 L410 423" stroke="#10b981" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="400" y="470" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#10b981">Module Completed</text>
  
  <!-- Footer -->
  <text x="150" y="530" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#64748b">Date of Completion</text>
  <text x="150" y="550" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="white">${escapeXml(completionDate)}</text>
  
  <text x="400" y="545" text-anchor="middle" font-family="Georgia, serif" font-size="18" fill="#f59e0b" font-style="italic">Learning Hub</text>
  <text x="400" y="565" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="#64748b">Authorized Signature</text>
  
  <text x="650" y="530" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#64748b">Certificate ID</text>
  <text x="650" y="550" text-anchor="middle" font-family="Courier, monospace" font-size="12" fill="white">${certificateId.slice(0, 8).toUpperCase()}</text>
</svg>`
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
