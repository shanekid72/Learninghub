import { describe, expect, it } from "vitest"
import { isAnswerCorrect, scoreQuizSubmission } from "@/lib/quiz-scoring"
import { StoredQuizQuestion } from "@/lib/quiz-types"

const questions: StoredQuizQuestion[] = [
  {
    id: "q1",
    type: "multiple-choice",
    text: "Question 1",
    options: [
      { id: "a", text: "A" },
      { id: "b", text: "B" },
    ],
    correctAnswers: ["a"],
  },
  {
    id: "q2",
    type: "multi-select",
    text: "Question 2",
    options: [
      { id: "a", text: "A" },
      { id: "b", text: "B" },
      { id: "c", text: "C" },
    ],
    correctAnswers: ["a", "c"],
  },
]

describe("quiz-scoring", () => {
  it("treats answer arrays as set-equal (order-independent)", () => {
    expect(isAnswerCorrect(["a", "c"], ["c", "a"])).toBe(true)
    expect(isAnswerCorrect(["a"], ["a", "c"])).toBe(false)
    expect(isAnswerCorrect(["a", "b"], ["a", "c"])).toBe(false)
  })

  it("scores single and multi-select questions correctly", () => {
    const result = scoreQuizSubmission(
      questions,
      {
        q1: ["a"],
        q2: ["c", "a"],
      },
      70,
    )

    expect(result.score).toBe(100)
    expect(result.passed).toBe(true)
    expect(result.correctAnswers).toBe(2)
    expect(result.totalQuestions).toBe(2)
  })

  it("fails when answers are partially correct", () => {
    const result = scoreQuizSubmission(
      questions,
      {
        q1: ["a"],
        q2: ["a"],
      },
      70,
    )

    expect(result.score).toBe(50)
    expect(result.passed).toBe(false)
    expect(result.feedback.find((f) => f.questionId === "q2")?.correct).toBe(false)
  })

  it("handles empty quizzes safely", () => {
    const result = scoreQuizSubmission([], {}, 60)
    expect(result.score).toBe(0)
    expect(result.passed).toBe(false)
    expect(result.totalQuestions).toBe(0)
  })
})
