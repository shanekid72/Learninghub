import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const moduleId = searchParams.get('moduleId')
    const quizId = searchParams.get('quizId')

    let query = supabase
      .from('quiz_attempts')
      .select(`
        *,
        quizzes (
          id,
          module_id,
          title,
          passing_score
        )
      `)
      .eq('user_id', user.id)
      .order('completed_at', { ascending: false })

    if (quizId) {
      query = query.eq('quiz_id', quizId)
    }

    if (moduleId) {
      query = query.eq('quizzes.module_id', moduleId)
    }

    const { data: attempts, error } = await query

    if (error) {
      throw error
    }

    return NextResponse.json(attempts || [])
  } catch (error) {
    console.error('Error fetching quiz attempts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch quiz attempts' },
      { status: 500 }
    )
  }
}
