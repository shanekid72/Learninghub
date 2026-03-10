import { NextResponse } from "next/server"
import { getSessionContext } from "@/lib/app-session"
import { createAdminClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const session = await getSessionContext()
    if (!session?.profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createAdminClient()

    const { data: certificates, error } = await supabase
      .from('certificates')
      .select('*')
      .eq('user_id', session.profile.id)
      .order('issued_at', { ascending: false })

    if (error) {
      throw error
    }

    return NextResponse.json(certificates || [])
  } catch (error) {
    console.error('Error fetching user certificates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch certificates' },
      { status: 500 }
    )
  }
}
