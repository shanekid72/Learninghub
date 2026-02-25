"use client"

import { Quiz, QuizResult } from "@/lib/quiz-types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { QuestionCard } from "./question-card"
import { CheckCircle2, XCircle, RotateCcw, X, Trophy, Target } from "lucide-react"
import { cn } from "@/lib/utils"

interface QuizResultsProps {
  result: QuizResult
  quiz: Quiz
  onRetry?: () => void
  onClose?: () => void
}

export function QuizResults({ result, quiz, onRetry, onClose }: QuizResultsProps) {
  const { score, passed, totalQuestions, correctAnswers, feedback } = result

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <Card className={cn(
        "border-2",
        passed ? "border-green-500" : "border-red-500"
      )}>
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4">
            {passed ? (
              <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <Trophy className="w-10 h-10 text-green-500" />
              </div>
            ) : (
              <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
                <Target className="w-10 h-10 text-red-500" />
              </div>
            )}
          </div>
          <CardTitle className="text-2xl">
            {passed ? "Congratulations!" : "Keep Learning!"}
          </CardTitle>
          <p className="text-muted-foreground">
            {passed 
              ? "You've successfully passed the quiz." 
              : `You need ${quiz.passingScore}% to pass. Keep practicing!`}
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="text-center">
            <div className="text-5xl font-bold mb-2">
              {score}%
            </div>
            <Progress 
              value={score} 
              className={cn(
                "h-3",
                passed ? "[&>div]:bg-green-500" : "[&>div]:bg-red-500"
              )}
            />
            <p className="text-sm text-muted-foreground mt-2">
              {correctAnswers} of {totalQuestions} questions correct
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950">
              <div className="flex items-center justify-center gap-2 mb-1">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span className="text-2xl font-bold text-green-700 dark:text-green-300">
                  {correctAnswers}
                </span>
              </div>
              <p className="text-sm text-green-600 dark:text-green-400">Correct</p>
            </div>
            <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950">
              <div className="flex items-center justify-center gap-2 mb-1">
                <XCircle className="w-5 h-5 text-red-500" />
                <span className="text-2xl font-bold text-red-700 dark:text-red-300">
                  {totalQuestions - correctAnswers}
                </span>
              </div>
              <p className="text-sm text-red-600 dark:text-red-400">Incorrect</p>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex justify-center gap-4">
          {!passed && onRetry && (
            <Button onClick={onRetry} variant="default">
              <RotateCcw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          )}
          {onClose && (
            <Button onClick={onClose} variant={passed ? "default" : "outline"}>
              <X className="w-4 h-4 mr-2" />
              Close
            </Button>
          )}
        </CardFooter>
      </Card>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Review Your Answers</h3>
        {quiz.questions.map((question, index) => {
          const questionFeedback = feedback.find(f => f.questionId === question.id)
          return (
            <Card key={question.id} className={cn(
              "border",
              questionFeedback?.correct ? "border-green-200" : "border-red-200"
            )}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  {questionFeedback?.correct ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                  <span className="text-sm font-medium">Question {index + 1}</span>
                </div>
              </CardHeader>
              <CardContent>
                <QuestionCard
                  question={question}
                  selectedAnswers={questionFeedback?.userAnswers || []}
                  onAnswer={() => {}}
                  showCorrect={true}
                  correctAnswers={questionFeedback?.correctAnswers || []}
                />
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
