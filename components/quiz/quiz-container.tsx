"use client"

import { useState } from "react"
import { Quiz, QuizResult, QuizSubmission } from "@/lib/quiz-types"
import { QuestionCard } from "./question-card"
import { QuizProgress } from "./quiz-progress"
import { QuizResults } from "./quiz-results"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, ArrowRight, CheckCircle, Loader2, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface QuizContainerProps {
  quiz: Quiz
  onComplete?: (result: QuizResult) => void
  onClose?: () => void
}

export function QuizContainer({ quiz, onComplete, onClose }: QuizContainerProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string[]>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<QuizResult | null>(null)
  const [showResults, setShowResults] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const question = quiz.questions[currentQuestion]
  const isLastQuestion = currentQuestion === quiz.questions.length - 1
  const isFirstQuestion = currentQuestion === 0
  const hasAnswered = answers[question?.id]?.length > 0

  const handleAnswer = (questionId: string, selectedOptions: string[]) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: selectedOptions
    }))
  }

  const handleNext = () => {
    if (!isLastQuestion) {
      setCurrentQuestion(prev => prev + 1)
    }
  }

  const handlePrevious = () => {
    if (!isFirstQuestion) {
      setCurrentQuestion(prev => prev - 1)
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setSubmitError(null)
    
    try {
      const submission: QuizSubmission = {
        quizId: quiz.id,
        moduleId: quiz.moduleId,
        answers
      }

      const response = await fetch('/api/quiz/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submission)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        if (response.status === 429) {
          throw new Error('Too many attempts. Please wait a moment and try again.')
        }
        throw new Error(errorData.error || 'Failed to submit quiz')
      }

      const quizResult: QuizResult = await response.json()
      setResult(quizResult)
      setShowResults(true)
      onComplete?.(quizResult)
    } catch (error) {
      console.error('Quiz submission error:', error)
      setSubmitError(error instanceof Error ? error.message : 'Failed to submit quiz. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRetry = () => {
    setAnswers({})
    setCurrentQuestion(0)
    setResult(null)
    setShowResults(false)
  }

  if (showResults && result) {
    return (
      <QuizResults
        result={result}
        quiz={quiz}
        onRetry={handleRetry}
        onClose={onClose}
      />
    )
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{quiz.title}</span>
          <span className="text-sm font-normal text-muted-foreground">
            Passing score: {quiz.passingScore}%
          </span>
        </CardTitle>
        <QuizProgress
          current={currentQuestion + 1}
          total={quiz.questions.length}
          answeredCount={Object.keys(answers).length}
        />
      </CardHeader>

      <CardContent className="space-y-4">
        {submitError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        )}
        
        <QuestionCard
          question={question}
          selectedAnswers={answers[question.id] || []}
          onAnswer={(selected) => handleAnswer(question.id, selected)}
          showCorrect={false}
        />
      </CardContent>

      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={isFirstQuestion}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>

        <div className="flex gap-2">
          {isLastQuestion ? (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || Object.keys(answers).length < quiz.questions.length}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Submit Quiz
                </>
              )}
            </Button>
          ) : (
            <Button onClick={handleNext} disabled={!hasAnswered}>
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  )
}
