import { NextResponse } from "next/server"
import { getSessionContext } from "@/lib/app-session"
import { createAdminClient } from "@/lib/supabase/server"
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
    const supabase = await createAdminClient()

    const { data: module, error: moduleError } = await supabase
      .from("learning_modules")
      .select("module_id, status, quiz_mode")
      .eq("module_id", moduleId)
      .maybeSingle()

    if (moduleError) {
      throw moduleError
    }

    if (!module || module.status !== "published" || module.quiz_mode !== "internal") {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 })
    }

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
      passingScore: quiz.passing_score ?? 70,
      createdAt: quiz.created_at || undefined
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
