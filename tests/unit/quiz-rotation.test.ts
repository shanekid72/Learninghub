import { describe, expect, it } from "vitest"
import { personalizeQuizForLearner, selectQuizQuestionsForLearner } from "@/lib/quiz-rotation"
import { PublicQuizQuestion, StoredQuizQuestion } from "@/lib/quiz-types"

const baseQuestions: PublicQuizQuestion[] = [
  {
    id: "q1",
    type: "multiple-choice",
    text: "Question 1",
    options: [
      { id: "q1-a", text: "A" },
      { id: "q1-b", text: "B" },
      { id: "q1-c", text: "C" },
      { id: "q1-d", text: "D" },
    ],
  },
  {
    id: "q2",
    type: "multiple-choice",
    text: "Question 2",
    options: [
      { id: "q2-a", text: "A" },
      { id: "q2-b", text: "B" },
      { id: "q2-c", text: "C" },
      { id: "q2-d", text: "D" },
    ],
  },
  {
    id: "q3",
    type: "multiple-choice",
    text: "Question 3",
    options: [
      { id: "q3-a", text: "A" },
      { id: "q3-b", text: "B" },
      { id: "q3-c", text: "C" },
      { id: "q3-d", text: "D" },
    ],
  },
  {
    id: "q4",
    type: "multiple-choice",
    text: "Question 4",
    options: [
      { id: "q4-a", text: "A" },
      { id: "q4-b", text: "B" },
      { id: "q4-c", text: "C" },
      { id: "q4-d", text: "D" },
    ],
  },
  {
    id: "q5",
    type: "multiple-choice",
    text: "Question 5",
    options: [
      { id: "q5-a", text: "A" },
      { id: "q5-b", text: "B" },
      { id: "q5-c", text: "C" },
      { id: "q5-d", text: "D" },
    ],
  },
]

describe("quiz rotation", () => {
  it("returns the same rotation for the same learner and quiz", () => {
    const first = personalizeQuizForLearner("quiz-1", "learner-1", baseQuestions as StoredQuizQuestion[])
    const second = personalizeQuizForLearner("quiz-1", "learner-1", baseQuestions as StoredQuizQuestion[])

    expect(second).toEqual(first)
  })

  it("returns a different rotation for different learners", () => {
    const first = personalizeQuizForLearner("quiz-1", "learner-1", baseQuestions as StoredQuizQuestion[])
    const second = personalizeQuizForLearner("quiz-1", "learner-2", baseQuestions as StoredQuizQuestion[])

    expect(second).not.toEqual(first)
  })

  it("preserves the full question and option set", () => {
    const rotated = personalizeQuizForLearner("quiz-1", "learner-1", baseQuestions as StoredQuizQuestion[])

    expect(rotated.map((question) => question.id).sort()).toEqual(
      baseQuestions.map((question) => question.id).sort(),
    )

    for (const question of rotated) {
      const original = baseQuestions.find((candidate) => candidate.id === question.id)

      expect(question.options.map((option) => option.id).sort()).toEqual(
        original?.options.map((option) => option.id).sort(),
      )
    }
  })

  it("selects one question per variant group for each learner", () => {
    const pooledQuestions: StoredQuizQuestion[] = [
      {
        id: "core",
        type: "multiple-choice",
        text: "Core question",
        options: [{ id: "a", text: "A" }, { id: "b", text: "B" }],
        correctAnswers: ["a"],
      },
      {
        id: "variant-a",
        type: "multiple-choice",
        text: "Variant A",
        variantGroup: "pool-1",
        options: [{ id: "a", text: "A" }, { id: "b", text: "B" }],
        correctAnswers: ["a"],
      },
      {
        id: "variant-b",
        type: "multiple-choice",
        text: "Variant B",
        variantGroup: "pool-1",
        options: [{ id: "a", text: "A" }, { id: "b", text: "B" }],
        correctAnswers: ["a"],
      },
    ]

    const learnerOne = selectQuizQuestionsForLearner("quiz-1", "learner-1", pooledQuestions)
    const learnerTwo = selectQuizQuestionsForLearner("quiz-1", "learner-2", pooledQuestions)

    expect(learnerOne).toHaveLength(2)
    expect(learnerTwo).toHaveLength(2)
    expect(learnerOne.some((question) => question.id === "core")).toBe(true)
    expect(learnerTwo.some((question) => question.id === "core")).toBe(true)
    expect(learnerOne.filter((question) => question.variantGroup === "pool-1")).toHaveLength(1)
    expect(learnerTwo.filter((question) => question.variantGroup === "pool-1")).toHaveLength(1)
  })
})
