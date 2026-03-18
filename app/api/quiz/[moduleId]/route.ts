import { NextResponse } from "next/server"
import { getSessionContext } from "@/lib/app-session"
import { createAdminClient } from "@/lib/supabase/server"
import { Quiz, StoredQuizQuestion } from "@/lib/quiz-types"
import { personalizeQuizForLearner } from "@/lib/quiz-rotation"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ moduleId: string }> }
) {
  try {
    const session = await getSessionContext()
    if (!session?.profile) {
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

    const personalizedQuestions = personalizeQuizForLearner(
      quiz.id,
      session.profile.id,
      quiz.questions as unknown as StoredQuizQuestion[],
    )

    const formattedQuiz: Quiz = {
      id: quiz.id,
      moduleId: quiz.module_id,
      title: quiz.title,
      questions: personalizedQuestions,
      passingScore: quiz.passing_score ?? 70,
      createdAt: quiz.created_at || undefined
    }

    const { data: passingAttempt, error: passingAttemptError } = await supabase
      .from("quiz_attempts")
      .select("id")
      .eq("quiz_id", quiz.id)
      .eq("user_id", session.profile.id)
      .eq("passed", true)
      .limit(1)
      .maybeSingle()

    if (passingAttemptError && passingAttemptError.code !== "PGRST116") {
      throw passingAttemptError
    }

    return NextResponse.json({
      ...formattedQuiz,
      userHasPassed: Boolean(passingAttempt),
    })
  } catch (error) {
    console.error('Error fetching quiz:', error)
    return NextResponse.json(
      { error: 'Failed to fetch quiz' },
      { status: 500 }
    )
  }
}
