"use client"

import * as React from "react"
import {
  X,
  Clock,
  Calendar,
  User,
  Tag,
  CheckCircle2,
  ExternalLink,
  BookOpen,
  FileText,
  Presentation,
  MessageSquare,
  Award,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { EmbedFrame } from "./embed-frame"
import { QuizContainer } from "./quiz"
import { CommentSection } from "./comments"
import type { Module } from "@/lib/learning-data"
import type { Quiz, QuizResult } from "@/lib/quiz-types"

type TabType = "content" | "quiz" | "comments"

interface ModuleDetailModalProps {
  isOpen: boolean
  onClose: () => void
  module: Module | null
  onMarkComplete: (moduleId: number | string) => void
}

export function ModuleDetailModal({
  isOpen,
  onClose,
  module,
  onMarkComplete,
}: ModuleDetailModalProps) {
  const [activeTab, setActiveTab] = React.useState<TabType>("content")
  const [supabaseQuiz, setSupabaseQuiz] = React.useState<Quiz | null>(null)
  const [quizLoading, setQuizLoading] = React.useState(false)
  const [quizPassed, setQuizPassed] = React.useState(false)

  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
      setActiveTab("content")
      setSupabaseQuiz(null)
      setQuizPassed(false)
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [isOpen])

  React.useEffect(() => {
    if (isOpen && module) {
      fetchSupabaseQuiz(String(module.id))
    }
  }, [isOpen, module])

  const fetchSupabaseQuiz = async (moduleId: string) => {
    setQuizLoading(true)
    try {
      const response = await fetch(`/api/quiz/${moduleId}`)
      if (response.ok) {
        const quiz = await response.json()
        setSupabaseQuiz(quiz)
      }
    } catch (error) {
      console.error('Failed to fetch quiz:', error)
    } finally {
      setQuizLoading(false)
    }
  }

  const handleQuizComplete = (result: QuizResult) => {
    if (result.passed) {
      setQuizPassed(true)
    }
  }

  if (!isOpen || !module) return null

  const typeIcon =
    module.type === "VIDEO" ? (
      <BookOpen className="w-4 h-4" />
    ) : module.type === "DOC" ? (
      <FileText className="w-4 h-4" />
    ) : (
      <Presentation className="w-4 h-4" />
    )

  const hasQuiz = !!module.quizEmbedUrl || !!module.quizUrl || !!supabaseQuiz
  const hasComments = true

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center overflow-y-auto py-8 px-4">
      <div className="relative bg-neutral-900 border border-neutral-800 rounded-xl w-full max-w-6xl shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-neutral-800">
          <div className="flex-1 pr-4">
            <div className="flex items-center gap-2 mb-2">
              {typeIcon}
              <span className="text-sm text-neutral-400 uppercase tracking-wide">
                {module.type}
              </span>
              {module.badges?.map((badge) => (
                <span
                  key={badge}
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge === "MANDATORY"
                    ? "bg-red-900/60 text-red-300"
                    : badge === "NEW"
                      ? "bg-emerald-900/60 text-emerald-300"
                      : "bg-amber-900/60 text-amber-300"
                    }`}
                >
                  {badge}
                </span>
              ))}
            </div>
            <h2 className="text-2xl font-bold text-white">{module.title}</h2>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
            className="text-neutral-400 hover:text-white hover:bg-neutral-800 flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex flex-col lg:flex-row">
          {/* Main content area */}
          <div className="flex-1 p-6">
            {/* Tabs */}
            {(hasQuiz || hasComments) && (
              <div className="flex gap-1 mb-4 bg-neutral-800 rounded-lg p-1 w-fit">
                <button
                  type="button"
                  onClick={() => setActiveTab("content")}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === "content"
                    ? "bg-neutral-700 text-white"
                    : "text-neutral-400 hover:text-white"
                    }`}
                >
                  <BookOpen className="w-4 h-4" />
                  Content
                </button>
                {hasQuiz && (
                  <button
                    type="button"
                    onClick={() => setActiveTab("quiz")}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === "quiz"
                      ? "bg-neutral-700 text-white"
                      : "text-neutral-400 hover:text-white"
                      }`}
                  >
                    <Award className="w-4 h-4" />
                    Quiz
                    {quizPassed && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  </button>
                )}
                {hasComments && (
                  <button
                    type="button"
                    onClick={() => setActiveTab("comments")}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === "comments"
                      ? "bg-neutral-700 text-white"
                      : "text-neutral-400 hover:text-white"
                      }`}
                  >
                    <MessageSquare className="w-4 h-4" />
                    Comments
                  </button>
                )}
              </div>
            )}

            {activeTab === "content" && (
              <EmbedFrame
                src={module.contentEmbedUrl}
                title={module.title}
                type={module.type}
                openUrl={module.openUrl}
              />
            )}

            {activeTab === "quiz" && quizLoading && (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <Loader2 className="w-8 h-8 text-neutral-500 animate-spin" />
                <p className="text-neutral-400">Loading quiz...</p>
              </div>
            )}

            {activeTab === "quiz" && !quizLoading && supabaseQuiz && (
              <div className="py-4">
                <QuizContainer
                  quiz={supabaseQuiz}
                  onComplete={handleQuizComplete}
                  onClose={() => setActiveTab("content")}
                />
              </div>
            )}

            {activeTab === "quiz" && !quizLoading && !supabaseQuiz && module.quizEmbedUrl && (
              <EmbedFrame
                src={module.quizEmbedUrl}
                title={`${module.title} - Quiz`}
                type="DOC"
              />
            )}

            {activeTab === "quiz" && !quizLoading && !supabaseQuiz && !module.quizEmbedUrl && module.quizUrl && (
              <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
                <BookOpen className="w-12 h-12 text-neutral-500" />
                <p className="text-neutral-400">
                  This quiz opens in a new tab.
                </p>
                <a
                  href={module.quizUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button className="gap-2 bg-red-600 hover:bg-red-700 text-white">
                    <ExternalLink className="w-4 h-4" />
                    Open Quiz
                  </Button>
                </a>
              </div>
            )}

            {activeTab === "comments" && (
              <div className="py-4">
                <CommentSection moduleId={String(module.id)} />
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:w-80 border-t lg:border-t-0 lg:border-l border-neutral-800 p-6 flex flex-col gap-5">
            {/* Objective */}
            <div>
              <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wide mb-2">
                Objective
              </h3>
              <p className="text-neutral-200 text-sm leading-relaxed">
                {module.objective}
              </p>
            </div>

            {/* Meta */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3 text-sm text-neutral-300">
                <Clock className="w-4 h-4 text-neutral-500" />
                <span>{module.durationMins} min</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-neutral-300">
                <User className="w-4 h-4 text-neutral-500" />
                <span>{module.owner}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-neutral-300">
                <Calendar className="w-4 h-4 text-neutral-500" />
                <span>Updated {module.lastUpdated}</span>
              </div>
              {module.dueDate && (
                <div className="flex items-center gap-3 text-sm text-amber-400">
                  <Calendar className="w-4 h-4" />
                  <span>Due {module.dueDate}</span>
                </div>
              )}
            </div>

            {/* Teams */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Tag className="w-4 h-4 text-neutral-500" />
                <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wide">
                  Teams
                </h3>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {module.teams.map((team) => (
                  <span
                    key={team}
                    className="text-xs bg-neutral-800 text-neutral-300 px-2.5 py-1 rounded-full"
                  >
                    {team}
                  </span>
                ))}
              </div>
            </div>

            {/* Progress */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-neutral-400">Progress</span>
                <span className="text-sm font-medium text-white">
                  {module.progress}%
                </span>
              </div>
              <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${module.progress === 100 ? "bg-emerald-500" : "bg-red-600"
                    }`}
                  style={{ width: `${module.progress}%` }}
                />
              </div>
            </div>

            {/* Mark Complete */}
            {module.progress < 100 && (
              <Button
                onClick={() => onMarkComplete(module.id)}
                className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <CheckCircle2 className="w-4 h-4" />
                Mark as Complete
              </Button>
            )}
            {module.progress === 100 && (
              <div className="flex items-center justify-center gap-2 py-2 text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-medium">Completed</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
