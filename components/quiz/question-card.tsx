"use client"

import { QuizQuestion } from "@/lib/quiz-types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { CheckCircle2, XCircle } from "lucide-react"

interface QuestionCardProps {
  question: QuizQuestion
  selectedAnswers: string[]
  onAnswer: (selected: string[]) => void
  showCorrect?: boolean
  correctAnswers?: string[]
}

export function QuestionCard({
  question,
  selectedAnswers,
  onAnswer,
  showCorrect = false,
  correctAnswers = []
}: QuestionCardProps) {
  const handleSingleSelect = (value: string) => {
    onAnswer([value])
  }

  const handleMultiSelect = (optionId: string, checked: boolean) => {
    if (checked) {
      onAnswer([...selectedAnswers, optionId])
    } else {
      onAnswer(selectedAnswers.filter(id => id !== optionId))
    }
  }

  const getOptionStyle = (optionId: string) => {
    if (!showCorrect) return ""
    
    const isSelected = selectedAnswers.includes(optionId)
    const isCorrect = correctAnswers.includes(optionId)
    
    if (isCorrect && isSelected) {
      return "border-green-500 bg-green-50 dark:bg-green-950"
    }
    if (isCorrect && !isSelected) {
      return "border-green-500 bg-green-50 dark:bg-green-950"
    }
    if (!isCorrect && isSelected) {
      return "border-red-500 bg-red-50 dark:bg-red-950"
    }
    return ""
  }

  const renderOptions = () => {
    if (question.type === 'multi-select') {
      return (
        <div className="space-y-3">
          {question.options.map((option) => (
            <div
              key={option.id}
              className={cn(
                "flex items-center space-x-3 p-3 rounded-lg border transition-colors",
                getOptionStyle(option.id),
                !showCorrect && selectedAnswers.includes(option.id) && "border-primary bg-primary/5"
              )}
            >
              <Checkbox
                id={option.id}
                checked={selectedAnswers.includes(option.id)}
                onCheckedChange={(checked) => handleMultiSelect(option.id, checked as boolean)}
                disabled={showCorrect}
              />
              <Label htmlFor={option.id} className="flex-1 cursor-pointer">
                {option.text}
              </Label>
              {showCorrect && correctAnswers.includes(option.id) && (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              )}
              {showCorrect && selectedAnswers.includes(option.id) && !correctAnswers.includes(option.id) && (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
            </div>
          ))}
        </div>
      )
    }

    return (
      <RadioGroup
        value={selectedAnswers[0] || ""}
        onValueChange={handleSingleSelect}
        disabled={showCorrect}
      >
        <div className="space-y-3">
          {question.options.map((option) => (
            <div
              key={option.id}
              className={cn(
                "flex items-center space-x-3 p-3 rounded-lg border transition-colors",
                getOptionStyle(option.id),
                !showCorrect && selectedAnswers.includes(option.id) && "border-primary bg-primary/5"
              )}
            >
              <RadioGroupItem value={option.id} id={option.id} />
              <Label htmlFor={option.id} className="flex-1 cursor-pointer">
                {option.text}
              </Label>
              {showCorrect && correctAnswers.includes(option.id) && (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              )}
              {showCorrect && selectedAnswers.includes(option.id) && !correctAnswers.includes(option.id) && (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
            </div>
          ))}
        </div>
      </RadioGroup>
    )
  }

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="px-0 pt-0">
        <CardTitle className="text-lg font-medium">
          {question.text}
        </CardTitle>
        {question.type === 'multi-select' && (
          <p className="text-sm text-muted-foreground">Select all that apply</p>
        )}
      </CardHeader>
      <CardContent className="px-0 pb-0">
        {renderOptions()}
        {showCorrect && question.explanation && (
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <p className="text-sm font-medium mb-1">Explanation:</p>
            <p className="text-sm text-muted-foreground">{question.explanation}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
