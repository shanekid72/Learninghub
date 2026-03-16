import { z } from "zod"
import type { Database } from "@/lib/supabase/database.types"

export const moduleStatusValues = ["draft", "published", "archived"] as const
export const moduleTypeValues = ["VIDEO", "DOC", "SLIDES"] as const
export const moduleBadgeValues = ["MANDATORY", "NEW", "UPDATED"] as const
export const quizModeValues = ["none", "internal", "external_embed", "external_link"] as const
export const internalQuizQuestionTypeValues = ["multiple-choice", "true-false", "multi-select"] as const

export type ModuleStatus = (typeof moduleStatusValues)[number]
export type ModuleType = (typeof moduleTypeValues)[number]
export type ModuleBadge = (typeof moduleBadgeValues)[number]
export type QuizMode = (typeof quizModeValues)[number]
export type InternalQuizQuestionType = (typeof internalQuizQuestionTypeValues)[number]

export type LearningModuleRow = Database["public"]["Tables"]["learning_modules"]["Row"]
export type LearningTeamRow = Database["public"]["Tables"]["learning_teams"]["Row"]
export type QuizRow = Database["public"]["Tables"]["quizzes"]["Row"]
export type AnalyticsEventRow = Database["public"]["Tables"]["analytics_events"]["Row"]
export type ModuleAssignmentRow = Database["public"]["Tables"]["module_assignments"]["Row"]

export type InternalQuizOptionInput = {
  id: string
  text: string
}

export type InternalQuizQuestionInput = {
  id: string
  type: InternalQuizQuestionType
  text: string
  options: InternalQuizOptionInput[]
  correctAnswers: string[]
  explanation?: string
}

export type InternalQuizInput = {
  title: string
  passingScore: number
  questions: InternalQuizQuestionInput[]
}

export type AdminModulePayload = {
  moduleId: string
  title: string
  objective: string
  description?: string | null
  moduleType: ModuleType
  durationMins: number
  contentEmbedUrl: string
  openUrl?: string | null
  thumbnailUrl?: string | null
  owner: string
  badges: ModuleBadge[]
  teams: string[]
  status: ModuleStatus
  sortOrder: number
  quizMode: QuizMode
  quizEmbedUrl?: string | null
  quizUrl?: string | null
  quiz?: InternalQuizInput | null
  removeInternalQuiz?: boolean
}

export type ModuleMetrics = {
  assignmentCount: number
  views: number
  completions: number
  attempts: number
  avgScore: number
}

const optionalTrimmedString = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (typeof value !== "string") return null
    const clean = value.trim()
    return clean ? clean : null
  })

const optionalUrlString = optionalTrimmedString.superRefine((value, ctx) => {
  if (!value) return
  const result = z.string().url().safeParse(value)
  if (!result.success) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Must be a valid URL" })
  }
})

const quizOptionSchema = z.object({
  id: z.string().trim().min(1).max(80),
  text: z.string().trim().min(1).max(240),
})

const quizQuestionSchema = z.object({
  id: z.string().trim().min(1).max(80),
  type: z.enum(internalQuizQuestionTypeValues),
  text: z.string().trim().min(1).max(1000),
  options: z.array(quizOptionSchema).min(2).max(8),
  correctAnswers: z.array(z.string().trim().min(1).max(80)).min(1).max(8),
  explanation: optionalTrimmedString,
}).superRefine((question, ctx) => {
  const optionIds = question.options.map((option) => option.id)
  const uniqueOptionIds = new Set(optionIds)

  if (uniqueOptionIds.size !== optionIds.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Option IDs must be unique",
      path: ["options"],
    })
  }

  if (question.type === "true-false" && question.options.length !== 2) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "True/false questions must have exactly two options",
      path: ["options"],
    })
  }

  const validAnswers = question.correctAnswers.every((answer) => uniqueOptionIds.has(answer))
  if (!validAnswers) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Correct answers must reference existing option IDs",
      path: ["correctAnswers"],
    })
  }

  if (question.type !== "multi-select" && question.correctAnswers.length !== 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "This question type accepts exactly one correct answer",
      path: ["correctAnswers"],
    })
  }
})

const internalQuizSchema = z.object({
  title: z.string().trim().min(1).max(200),
  passingScore: z.number().int().min(0).max(100),
  questions: z.array(quizQuestionSchema).min(1).max(25),
})

const moduleIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .regex(/^[A-Za-z0-9._-]+$/, "Module ID can only include letters, numbers, dots, dashes, and underscores")

const adminModuleBaseSchema = z.object({
  moduleId: moduleIdSchema,
  title: z.string().trim().min(1).max(200),
  objective: z.string().trim().min(1).max(1000),
  description: optionalTrimmedString,
  moduleType: z.enum(moduleTypeValues),
  durationMins: z.number().int().min(0).max(600),
  contentEmbedUrl: z.string().trim().url(),
  openUrl: optionalUrlString,
  thumbnailUrl: optionalUrlString,
  owner: z.string().trim().min(1).max(200),
  badges: z.array(z.enum(moduleBadgeValues)).max(3).default([]),
  teams: z.array(z.string().trim().min(1).max(120)).max(25).default([]),
  status: z.enum(moduleStatusValues).default("draft"),
  sortOrder: z.number().int().min(0).max(100000).default(0),
  quizMode: z.enum(quizModeValues).default("none"),
  quizEmbedUrl: optionalUrlString,
  quizUrl: optionalUrlString,
  quiz: internalQuizSchema.nullable().optional(),
  removeInternalQuiz: z.boolean().optional().default(false),
})

function refineModuleSchema<T extends z.ZodTypeAny>(schema: T) {
  return schema.superRefine((payload, ctx) => {
    const hasUniqueBadges = new Set(payload.badges).size === payload.badges.length
    if (!hasUniqueBadges) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Badges must be unique",
        path: ["badges"],
      })
    }

    const uniqueTeams = new Set(payload.teams.map((team: string) => team.trim().toLowerCase()))
    if (uniqueTeams.size !== payload.teams.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Teams must be unique",
        path: ["teams"],
      })
    }

    if (payload.quizMode === "internal" && !payload.quiz) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Internal quiz details are required when quiz mode is internal",
        path: ["quiz"],
      })
    }

    if (payload.quizMode === "external_embed" && !payload.quizEmbedUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Quiz embed URL is required for external embedded quiz mode",
        path: ["quizEmbedUrl"],
      })
    }

    if (payload.quizMode === "external_link" && !payload.quizUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Quiz URL is required for external linked quiz mode",
        path: ["quizUrl"],
      })
    }
  })
}

export const adminModuleSchema = refineModuleSchema(adminModuleBaseSchema)
export const adminModuleUpdateSchema = refineModuleSchema(adminModuleBaseSchema.omit({ moduleId: true }))

export const adminTeamSchema = z.object({
  name: z.string().trim().min(1).max(120),
  sortOrder: z.number().int().min(0).max(100000).optional(),
  isActive: z.boolean().optional().default(true),
})

export function normalizeIsoDate(value: string | null | undefined): string | null {
  if (!value) return null
  return value.slice(0, 10)
}

export function mapModuleRowToLearnerModule(
  module: LearningModuleRow,
  assignment?: { assigned: true; dueDate?: string },
) {
  return {
    id: module.module_id,
    title: module.title,
    objective: module.objective,
    description: module.description,
    type: module.module_type,
    duration_mins: module.duration_mins,
    thumbnail_url: module.thumbnail_url || "",
    content_embed_url: module.content_embed_url,
    open_url: module.open_url || "",
    badges: module.badges.join(","),
    teams: module.teams.join(","),
    sort_order: module.sort_order,
    due_date: assignment?.dueDate ?? null,
    assigned: Boolean(assignment),
    last_updated: normalizeIsoDate(module.updated_at),
    owner: module.owner,
    quiz_mode: module.quiz_mode,
    quiz_embed_url: module.quiz_mode === "external_embed" ? module.quiz_embed_url : null,
    quiz_url: module.quiz_mode === "external_link" ? module.quiz_url : null,
  }
}

export function mapModuleRowToAdminModule(module: LearningModuleRow, metrics?: ModuleMetrics) {
  return {
    moduleId: module.module_id,
    title: module.title,
    objective: module.objective,
    description: module.description,
    moduleType: module.module_type as ModuleType,
    durationMins: module.duration_mins,
    contentEmbedUrl: module.content_embed_url,
    openUrl: module.open_url,
    thumbnailUrl: module.thumbnail_url,
    owner: module.owner,
    badges: module.badges as ModuleBadge[],
    teams: module.teams,
    status: module.status as ModuleStatus,
    sortOrder: module.sort_order,
    createdAt: module.created_at,
    updatedAt: module.updated_at,
    createdBy: module.created_by,
    updatedBy: module.updated_by,
    quizMode: module.quiz_mode as QuizMode,
    quizEmbedUrl: module.quiz_embed_url,
    quizUrl: module.quiz_url,
    metrics: metrics || defaultModuleMetrics(),
  }
}

export function mapQuizRowToInternalQuiz(quiz: QuizRow | null) {
  if (!quiz) return null
  return {
    id: quiz.id,
    title: quiz.title,
    passingScore: quiz.passing_score ?? 0,
    questions: quiz.questions as unknown as InternalQuizQuestionInput[],
    createdAt: quiz.created_at,
  }
}

export function defaultModuleMetrics(): ModuleMetrics {
  return {
    assignmentCount: 0,
    views: 0,
    completions: 0,
    attempts: 0,
    avgScore: 0,
  }
}

export function buildModuleMetrics(
  modules: Array<Pick<LearningModuleRow, "module_id">>,
  assignments: Pick<ModuleAssignmentRow, "module_id">[],
  analyticsEvents: Pick<AnalyticsEventRow, "module_id" | "event_type">[],
  quizAttempts: Array<{ score: number; module_id: string | null }>,
): Map<string, ModuleMetrics> {
  const metrics = new Map<string, ModuleMetrics>()

  for (const moduleRow of modules) {
    metrics.set(moduleRow.module_id, defaultModuleMetrics())
  }

  for (const assignment of assignments) {
    const bucket = metrics.get(assignment.module_id)
    if (!bucket) continue
    bucket.assignmentCount += 1
  }

  for (const event of analyticsEvents) {
    if (!event.module_id) continue
    const bucket = metrics.get(event.module_id)
    if (!bucket) continue

    if (event.event_type === "module_view") {
      bucket.views += 1
    }

    if (event.event_type === "module_complete") {
      bucket.completions += 1
    }
  }

  const scoreTotals = new Map<string, number>()
  for (const attempt of quizAttempts) {
    if (!attempt.module_id) continue
    const bucket = metrics.get(attempt.module_id)
    if (!bucket) continue

    bucket.attempts += 1
    scoreTotals.set(attempt.module_id, (scoreTotals.get(attempt.module_id) || 0) + attempt.score)
  }

  for (const [moduleId, bucket] of metrics.entries()) {
    bucket.avgScore = bucket.attempts > 0 ? Math.round((scoreTotals.get(moduleId) || 0) / bucket.attempts) : 0
  }

  return metrics
}

export function matchesModuleSearch(module: LearningModuleRow, search: string): boolean {
  if (!search) return true
  const value = search.trim().toLowerCase()
  if (!value) return true

  return [module.module_id, module.title, module.owner]
    .filter(Boolean)
    .some((field) => field.toLowerCase().includes(value))
}
