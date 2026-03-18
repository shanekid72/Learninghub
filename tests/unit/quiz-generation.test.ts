import { describe, expect, it } from "vitest"
import { __internal } from "@/lib/quiz-generation"

describe("quiz generation helpers", () => {
  it("sizes the quiz draft by duration bands", () => {
    expect(__internal.determineQuestionCount(4)).toBe(3)
    expect(__internal.determineQuestionCount(10)).toBe(4)
    expect(__internal.determineQuestionCount(18)).toBe(4)
    expect(__internal.determineQuestionCount(35)).toBe(5)
  })

  it("normalizes generated quiz output into stored internal quiz shape", () => {
    const quiz = __internal.normalizeQuiz({
      title: "RaaS Knowledge Check",
      passingScore: 80,
      questions: [
        {
          type: "multiple-choice",
          text: "What does RaaS stand for?",
          explanation: "RaaS expands to Remittance as a Service.",
          options: ["Remittance as a Service", "Risk as a Service", "Routing as a Service"],
          correctAnswerIndexes: [0],
        },
        {
          type: "true-false",
          text: "RaaS is delivered through APIs.",
          explanation: "The platform exposes remittance capabilities through APIs.",
          options: ["ignored", "ignored"],
          correctAnswerIndexes: [0],
        },
      ],
    })

    expect(quiz.title).toBe("RaaS Knowledge Check")
    expect(quiz.questions[0]).toMatchObject({
      type: "multiple-choice",
      correctAnswers: ["q1-o-1"],
      options: [
        { id: "q1-o-1", text: "Remittance as a Service" },
        { id: "q1-o-2", text: "Risk as a Service" },
        { id: "q1-o-3", text: "Routing as a Service" },
      ],
    })
    expect(quiz.questions[1]).toMatchObject({
      type: "true-false",
      options: [
        { id: "q2-o-1", text: "True" },
        { id: "q2-o-2", text: "False" },
      ],
      correctAnswers: ["q2-o-1"],
    })
  })
})
