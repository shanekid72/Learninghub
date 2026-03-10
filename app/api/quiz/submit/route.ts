import { NextResponse } from "next/server"
import { getSessionContext } from "@/lib/app-session"
import { createAdminClient } from "@/lib/supabase/server"
import { QuizSubmission, StoredQuizQuestion } from "@/lib/quiz-types"
import { z } from "zod"
import { checkRateLimit, getRateLimitResponse, getClientIP } from "@/lib/rate-limit"
import { scoreQuizSubmission } from "@/lib/quiz-scoring"

const submissionSchema = z.object({
  quizId: z.string().uuid(),
  moduleId: z.string(),
  answers: z.record(z.array(z.string()))
})

export async function POST(request: Request) {
  try {
    const clientIP = getClientIP(request)
    const rateLimitResult = checkRateLimit(clientIP, '/api/quiz/submit')
    
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

    const session = await getSessionContext()
    if (!session?.profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

    const questions = quiz.questions as unknown as StoredQuizQuestion[]
    const result = scoreQuizSubmission(questions, submission.answers, quiz.passing_score)

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

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error submitting quiz:', error)
    return NextResponse.json(
      { error: 'Failed to submit quiz' },
      { status: 500 }
    )
  }
}
