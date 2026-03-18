import { z } from "zod"
import type { InternalQuizInput, InternalQuizQuestionInput } from "@/lib/learning-modules"

type QuizGenerationContext = {
  moduleId: string
  title: string
  objective: string
  description: string | null
  owner: string
  durationMins: number
  moduleType: string
  teams: string[]
  badges: string[]
  transcript: string | null
  generationNotes: string | null
  sourceSummary: string
}

export type QuizDraftGenerationResult = {
  quiz: InternalQuizInput
  contextSource: "transcript+metadata" | "metadata"
  warnings: string[]
  model: string
}

type ResponsesApiPayload = {
  output?: Array<{
    type?: string
    content?: Array<{
      type?: string
      text?: string
    }>
    text?: string
  }>
}

const generatedQuizSchema = z.object({
  title: z.string().trim().min(1).max(200),
  passingScore: z.number().int().min(70).max(100),
  questions: z.array(
    z.object({
      type: z.enum(["multiple-choice", "true-false", "multi-select"]),
      text: z.string().trim().min(1).max(1000),
      explanation: z.string().trim().min(1).max(500),
      options: z.array(z.string().trim().min(1).max(240)).min(2).max(6),
      correctAnswerIndexes: z.array(z.number().int().min(0).max(5)).min(1).max(3),
    }),
  ).min(3).max(5),
})

type GeneratedQuizSchema = z.infer<typeof generatedQuizSchema>

const JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string", minLength: 1, maxLength: 200 },
    passingScore: { type: "integer", minimum: 70, maximum: 100 },
    questions: {
      type: "array",
      minItems: 3,
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          type: { type: "string", enum: ["multiple-choice", "true-false", "multi-select"] },
          text: { type: "string", minLength: 1, maxLength: 1000 },
          explanation: { type: "string", minLength: 1, maxLength: 500 },
          options: {
            type: "array",
            minItems: 2,
            maxItems: 6,
            items: { type: "string", minLength: 1, maxLength: 240 },
          },
          correctAnswerIndexes: {
            type: "array",
            minItems: 1,
            maxItems: 3,
            items: { type: "integer", minimum: 0, maximum: 5 },
          },
        },
        required: ["type", "text", "explanation", "options", "correctAnswerIndexes"],
      },
    },
  },
  required: ["title", "passingScore", "questions"],
} as const

const QUIZ_DRAFT_LIMITS = {
  transcriptChars: 12000,
  generationNotesChars: 1200,
  titleChars: 160,
  objectiveChars: 500,
  descriptionChars: 900,
  ownerChars: 120,
} as const

function getQuizGenerationModel(): string {
  return (process.env.OPENAI_QUIZ_MODEL || "gpt-5-mini").trim() || "gpt-5-mini"
}

export function isQuizGenerationConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim())
}

function createId(prefix: string, index: number): string {
  return `${prefix}-${index + 1}`
}

function determineQuestionCount(durationMins: number): number {
  if (durationMins <= 8) return 3
  if (durationMins <= 18) return 4
  return 5
}

function trimForPrompt(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value
  return `${value.slice(0, maxLength)}\n\n[truncated]`
}

function buildPrompt(context: QuizGenerationContext): string {
  const questionCount = determineQuestionCount(context.durationMins)
  const transcriptBlock = context.transcript
    ? `Transcript:\n${trimForPrompt(context.transcript, QUIZ_DRAFT_LIMITS.transcriptChars)}`
    : "Transcript: unavailable"
  const notesBlock = context.generationNotes
    ? `Admin notes:\n${trimForPrompt(context.generationNotes, QUIZ_DRAFT_LIMITS.generationNotesChars)}`
    : "Admin notes: none"

  return [
    `Create a certification-grade internal quiz draft for LearningHub module ${context.moduleId}.`,
    `Return exactly ${questionCount} questions.`,
    "Use only facts that are directly supported by the provided source material.",
    "Prefer questions that test understanding of key concepts, decisions, and process details instead of trivia.",
    "All questions and explanations must be in English.",
    "For true-false questions, the only options must be True and False.",
    "For multiple-choice questions, provide exactly one correct answer.",
    "For multi-select questions, provide exactly two correct answers unless the source strongly supports only one.",
    "Avoid using 'all of the above' or 'none of the above'.",
    "If the source material is thin, generate fewer subtle questions and focus on fundamentals that are explicitly present.",
    "",
    `Module title: ${trimForPrompt(context.title, QUIZ_DRAFT_LIMITS.titleChars)}`,
    `Objective: ${trimForPrompt(context.objective, QUIZ_DRAFT_LIMITS.objectiveChars)}`,
    `Description: ${trimForPrompt(context.description || "None", QUIZ_DRAFT_LIMITS.descriptionChars)}`,
    `Owner: ${trimForPrompt(context.owner, QUIZ_DRAFT_LIMITS.ownerChars)}`,
    `Duration minutes: ${context.durationMins}`,
    `Module type: ${context.moduleType}`,
    `Teams: ${context.teams.join(", ") || "None"}`,
    `Badges: ${context.badges.join(", ") || "None"}`,
    `Context source: ${context.sourceSummary}`,
    "",
    transcriptBlock,
    "",
    notesBlock,
  ].join("\n")
}

function extractTextFromResponse(payload: ResponsesApiPayload): string | null {
  for (const item of payload.output || []) {
    if (typeof item.text === "string" && item.text.trim()) {
      return item.text
    }

    for (const content of item.content || []) {
      if (typeof content.text === "string" && content.text.trim()) {
        return content.text
      }
    }
  }

  return null
}

function normalizeQuestion(question: GeneratedQuizSchema["questions"][number], index: number): InternalQuizQuestionInput {
  const options = question.type === "true-false"
    ? ["True", "False"]
    : question.options.map((option) => option.trim())

  const optionObjects = options.map((option, optionIndex) => ({
    id: createId(`q${index + 1}-o`, optionIndex),
    text: option,
  }))

  const maxIndex = optionObjects.length - 1
  const validAnswerIndexes = question.correctAnswerIndexes
    .filter((answerIndex) => answerIndex >= 0 && answerIndex <= maxIndex)

  const uniqueAnswerIndexes = [...new Set(validAnswerIndexes)]
  const correctedAnswers = question.type === "multi-select"
    ? uniqueAnswerIndexes.slice(0, 2)
    : [uniqueAnswerIndexes[0] ?? 0]

  return {
    id: createId("question", index),
    type: question.type,
    text: question.text.trim(),
    explanation: question.explanation.trim(),
    options: optionObjects,
    correctAnswers: correctedAnswers.map((answerIndex) => optionObjects[answerIndex]?.id).filter(Boolean),
  }
}

function normalizeQuiz(payload: GeneratedQuizSchema): InternalQuizInput {
  return {
    title: payload.title.trim(),
    passingScore: payload.passingScore,
    questions: payload.questions.map(normalizeQuestion),
  }
}

export const __internal = {
  determineQuestionCount,
  limits: QUIZ_DRAFT_LIMITS,
  normalizeQuiz,
}

export async function generateQuizDraft(context: QuizGenerationContext): Promise<QuizDraftGenerationResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured")
  }

  const model = getQuizGenerationModel()
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      store: false,
      instructions: "You are an instructional designer producing certification-grade internal quiz drafts for an enterprise learning platform.",
      input: buildPrompt(context),
      text: {
        format: {
          type: "json_schema",
          name: "learninghub_quiz_draft",
          strict: true,
          schema: JSON_SCHEMA,
        },
      },
    }),
  })

  const payload = (await response.json().catch(() => ({}))) as ResponsesApiPayload & {
    error?: { message?: string }
  }

  if (!response.ok) {
    throw new Error(payload.error?.message || "OpenAI quiz generation failed")
  }

  const text = extractTextFromResponse(payload)
  if (!text) {
    throw new Error("OpenAI returned no quiz content")
  }

  let parsedJson: unknown
  try {
    parsedJson = JSON.parse(text)
  } catch {
    throw new Error("OpenAI returned invalid structured quiz data")
  }

  const parsed = generatedQuizSchema.safeParse(parsedJson)
  if (!parsed.success) {
    throw new Error("OpenAI returned quiz data that did not pass validation")
  }

  return {
    quiz: normalizeQuiz(parsed.data),
    contextSource: context.transcript ? "transcript+metadata" : "metadata",
    warnings: context.transcript ? [] : ["No YouTube transcript was available, so the draft was generated from module metadata and admin notes only."],
    model,
  }
}
