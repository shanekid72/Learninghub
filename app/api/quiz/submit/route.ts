import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { QuizSubmission, QuizResult, QuestionFeedback, QuizQuestion } from "@/lib/quiz-types"
import { z } from "zod"
import { checkRateLimit, getRateLimitResponse, getClientIP } from "@/lib/rate-limit"

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

    const submission: QuizSubmission = validation.data
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('*')
      .eq('id', submission.quizId)
      .single()

    if (quizError || !quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })
    }

    const questions = quiz.questions as QuizQuestion[]
    let correctCount = 0
    const feedback: QuestionFeedback[] = []

    for (const question of questions) {
      const userAnswers = submission.answers[question.id] || []
      const correctAnswers = question.correctAnswers
      
      const isCorrect = 
        userAnswers.length === correctAnswers.length &&
        userAnswers.every(a => correctAnswers.includes(a)) &&
        correctAnswers.every(a => userAnswers.includes(a))

      if (isCorrect) {
        correctCount++
      }

      feedback.push({
        questionId: question.id,
        correct: isCorrect,
        userAnswers,
        correctAnswers,
        explanation: question.explanation
      })
    }

    const score = Math.round((correctCount / questions.length) * 100)
    const passed = score >= quiz.passing_score

    const { error: attemptError } = await supabase
      .from('quiz_attempts')
      .insert({
        user_id: user.id,
        quiz_id: quiz.id,
        answers: submission.answers,
        score,
        passed
      })

    if (attemptError) {
      console.error('Failed to save quiz attempt:', attemptError)
    }

    const result: QuizResult = {
      score,
      passed,
      totalQuestions: questions.length,
      correctAnswers: correctCount,
      feedback
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
