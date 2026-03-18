import { PublicQuizQuestion, QuizOption, StoredQuizQuestion } from "@/lib/quiz-types"

type QuestionWithOptions = {
  id: string
  options: QuizOption[]
  variantGroup?: string | null
}

function hashSeed(input: string): number {
  let hash = 2166136261

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return hash >>> 0
}

function createRandom(seedInput: string): () => number {
  let state = hashSeed(seedInput) || 1

  return () => {
    state += 0x6d2b79f5
    let next = state
    next = Math.imul(next ^ (next >>> 15), next | 1)
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61)
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296
  }
}

function shuffleDeterministically<T>(items: T[], seedInput: string): T[] {
  const random = createRandom(seedInput)
  const shuffled = [...items]

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    ;[shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]]
  }

  return shuffled
}

function normalizeVariantGroup(value: string | null | undefined): string | null {
  const normalized = value?.trim()
  return normalized ? normalized : null
}

export function selectQuizQuestionsForLearner<T extends QuestionWithOptions>(
  quizId: string,
  learnerId: string,
  questions: T[],
): T[] {
  const variantsByGroup = new Map<string, T[]>()

  for (const question of questions) {
    const variantGroup = normalizeVariantGroup(question.variantGroup)
    if (!variantGroup) {
      continue
    }

    const current = variantsByGroup.get(variantGroup) || []
    current.push(question)
    variantsByGroup.set(variantGroup, current)
  }

  const chosenByGroup = new Map<string, string>()
  for (const [variantGroup, variants] of variantsByGroup.entries()) {
    const chosen = shuffleDeterministically(
      variants,
      `${quizId}:${learnerId}:group:${variantGroup}`,
    )[0]

    if (chosen) {
      chosenByGroup.set(variantGroup, chosen.id)
    }
  }

  const consumedGroups = new Set<string>()
  const selected: T[] = []

  for (const question of questions) {
    const variantGroup = normalizeVariantGroup(question.variantGroup)
    if (!variantGroup) {
      selected.push(question)
      continue
    }

    if (consumedGroups.has(variantGroup)) {
      continue
    }

    if (chosenByGroup.get(variantGroup) === question.id) {
      selected.push(question)
      consumedGroups.add(variantGroup)
    }
  }

  return selected
}

export function personalizeQuizForLearner(
  quizId: string,
  learnerId: string,
  questions: StoredQuizQuestion[],
): PublicQuizQuestion[] {
  const selectedQuestions = selectQuizQuestionsForLearner(quizId, learnerId, questions)
  const questionSeed = `${quizId}:${learnerId}:questions`
  const questionsWithRotatedOptions = selectedQuestions.map((question) => {
    const { correctAnswers: _correctAnswers, variantGroup: _variantGroup, ...safeQuestion } = question

    return {
      ...safeQuestion,
      options: shuffleDeterministically(
        question.options,
        `${quizId}:${learnerId}:${question.id}:options`,
      ),
    } satisfies PublicQuizQuestion
  })

  return shuffleDeterministically(questionsWithRotatedOptions, questionSeed)
}
