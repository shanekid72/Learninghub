import { QuestionFeedback, QuizResult, StoredQuizQuestion } from "@/lib/quiz-types"

export function isAnswerCorrect(userAnswers: string[], correctAnswers: string[]): boolean {
  return (
    userAnswers.length === correctAnswers.length &&
    userAnswers.every((answer) => correctAnswers.includes(answer)) &&
    correctAnswers.every((answer) => userAnswers.includes(answer))
  )
}

export function scoreQuizSubmission(
  questions: StoredQuizQuestion[],
  answers: Record<string, string[]>,
  passingScore: number,
): QuizResult {
  if (questions.length === 0) {
    return {
      score: 0,
      passed: false,
      totalQuestions: 0,
      correctAnswers: 0,
      feedback: [],
    }
  }

  let correctCount = 0
  const feedback: QuestionFeedback[] = []

  for (const question of questions) {
    const userAnswers = answers[question.id] || []
    const isCorrect = isAnswerCorrect(userAnswers, question.correctAnswers)

    if (isCorrect) {
      correctCount += 1
    }

    feedback.push({
      questionId: question.id,
      correct: isCorrect,
      userAnswers,
      correctAnswers: question.correctAnswers,
      explanation: question.explanation,
    })
  }

  const score = Math.round((correctCount / questions.length) * 100)
  return {
    score,
    passed: score >= passingScore,
    totalQuestions: questions.length,
    correctAnswers: correctCount,
    feedback,
  }
}
