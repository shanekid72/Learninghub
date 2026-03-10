import { NextResponse } from "next/server"
import { getSessionContext } from "@/lib/app-session"
import { createClient } from "@/lib/supabase/server"
import { PublicQuizQuestion, Quiz, StoredQuizQuestion } from "@/lib/quiz-types"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ moduleId: string }> }
) {
  try {
    const session = await getSessionContext()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { moduleId } = await params
    const supabase = await createClient()
    
    const { data: quiz, error } = await supabase
      .from('quizzes')
      .select('*')
      .eq('module_id', moduleId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })
      }
      throw error
    }

    const publicQuestions = (quiz.questions as unknown as StoredQuizQuestion[]).map((question) => {
      const { correctAnswers: _correctAnswers, ...safeQuestion } = question
      return safeQuestion as PublicQuizQuestion
    })

    const formattedQuiz: Quiz = {
      id: quiz.id,
      moduleId: quiz.module_id,
      title: quiz.title,
      questions: publicQuestions,
      passingScore: quiz.passing_score,
      createdAt: quiz.created_at
    }

    return NextResponse.json(formattedQuiz)
  } catch (error) {
    console.error('Error fetching quiz:', error)
    return NextResponse.json(
      { error: 'Failed to fetch quiz' },
      { status: 500 }
    )
  }
}
