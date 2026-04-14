import { NextResponse } from "next/server"
import { getSessionContext } from "@/lib/app-session"
import { createAdminClient } from "@/lib/supabase/server"
import { QuizSubmission, StoredQuizQuestion } from "@/lib/quiz-types"
import { z } from "zod"
import { checkRateLimit, getRateLimitResponse } from "@/lib/rate-limit"
import { scoreQuizSubmission } from "@/lib/quiz-scoring"
import { selectQuizQuestionsForLearner } from "@/lib/quiz-rotation"
import { recordAnalyticsEvent } from "@/lib/server-analytics"

const submissionSchema = z.object({
  quizId: z.string().uuid(),
  moduleId: z.string(),
  answers: z.record(z.array(z.string()))
})

export async function POST(request: Request) {
  try {
    const session = await getSessionContext()
    if (!session?.profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rateLimitResult = checkRateLimit(session.profile.id, '/api/quiz/submit')
    if (!rateLimitResult.success) {
      return getRateLimitResponse(rateLimitResult.resetIn)
    }

    const body = await request.json()

    const validation = submissionSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid submission data', details: validation.error.issues },
        { status: 400 }
      )
    }

    const submission: QuizSubmission = validation.data
    const supabase = await createAdminClient()

    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('*')
      .eq('id', submission.quizId)
      .single()

    if (quizError || !quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })
    }

    const { data: module, error: moduleError } = await supabase
      .from("learning_modules")
      .select("module_id, status, quiz_mode")
      .eq("module_id", quiz.module_id)
      .maybeSingle()

    if (moduleError) {
      throw moduleError
    }

    if (!module || module.status !== "published" || module.quiz_mode !== "internal") {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 })
    }

    const questions = selectQuizQuestionsForLearner(
      quiz.id,
      session.profile.id,
      quiz.questions as unknown as StoredQuizQuestion[],
    )

    const result = scoreQuizSubmission(questions, submission.answers, quiz.passing_score ?? 70)

    const { error: attemptError } = await supabase
      .from('quiz_attempts')
      .insert({
        user_id: session.profile.id,
        quiz_id: quiz.id,
        answers: submission.answers,
        score: result.score,
        passed: result.passed
      })

    if (attemptError) {
      console.error('Failed to save quiz attempt:', attemptError)
    }

    await recordAnalyticsEvent(
      {
        userId: session.profile.id,
        type: 'quiz_complete',
        moduleId: quiz.module_id,
        metadata: {
          quizId: quiz.id,
          score: result.score,
          passed: result.passed,
        },
      },
      supabase,
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error submitting quiz:', error)
    return NextResponse.json(
      { error: 'Failed to submit quiz' },
      { status: 500 }
    )
  }
}
