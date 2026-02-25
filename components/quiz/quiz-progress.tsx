"use client"

import { Progress } from "@/components/ui/progress"

interface QuizProgressProps {
  current: number
  total: number
  answeredCount: number
}

export function QuizProgress({ current, total, answeredCount }: QuizProgressProps) {
  const progressPercentage = (current / total) * 100
  const answeredPercentage = (answeredCount / total) * 100

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>Question {current} of {total}</span>
        <span>{answeredCount} answered</span>
      </div>
      <div className="relative">
        <Progress value={progressPercentage} className="h-2" />
        <div 
          className="absolute top-0 left-0 h-2 bg-green-500 rounded-full transition-all"
          style={{ width: `${answeredPercentage}%`, opacity: 0.3 }}
        />
      </div>
    </div>
  )
}
