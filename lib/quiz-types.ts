export interface QuizOption {
  id: string
  text: string
}

export interface QuizQuestionBase {
  id: string
  type: 'multiple-choice' | 'true-false' | 'multi-select'
  text: string
  options: QuizOption[]
  explanation?: string
}

export interface StoredQuizQuestion extends QuizQuestionBase {
  correctAnswers: string[]
}

export type PublicQuizQuestion = QuizQuestionBase

export interface Quiz {
  id: string
  moduleId: string
  title: string
  questions: PublicQuizQuestion[]
  passingScore: number
  createdAt?: string
}

export interface QuizAttempt {
  id: string
  userId: string
  quizId: string
  answers: Record<string, string[]>
  score: number
  passed: boolean
  completedAt: string
}

export interface QuizSubmission {
  quizId: string
  moduleId: string
  answers: Record<string, string[]>
}

export interface QuizResult {
  score: number
  passed: boolean
  totalQuestions: number
  correctAnswers: number
  feedback: QuestionFeedback[]
}

export interface QuestionFeedback {
  questionId: string
  correct: boolean
  userAnswers: string[]
  correctAnswers: string[]
  explanation?: string
}
