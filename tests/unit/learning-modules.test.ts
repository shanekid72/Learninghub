import { describe, expect, it } from "vitest"
import {
  adminModuleSchema,
  buildModuleMetrics,
  mapModuleRowToLearnerModule,
  type LearningModuleRow,
} from "@/lib/learning-modules"

function createModuleRow(overrides: Partial<LearningModuleRow> = {}): LearningModuleRow {
  return {
    module_id: "aml-101",
    title: "AML Basics",
    objective: "Learn the essentials",
    description: null,
    module_type: "VIDEO",
    duration_mins: 15,
    content_embed_url: "https://www.youtube.com/embed/example",
    open_url: "https://www.youtube.com/watch?v=example",
    thumbnail_url: "https://img.example.com/aml.png",
    owner: "Compliance",
    badges: ["MANDATORY", "NEW"],
    teams: ["LMT", "BA"],
    status: "published",
    sort_order: 10,
    created_at: "2026-03-16T00:00:00.000Z",
    updated_at: "2026-03-16T00:00:00.000Z",
    created_by: null,
    updated_by: null,
    quiz_mode: "external_embed",
    quiz_embed_url: "https://docs.google.com/forms/d/e/example/viewform?embedded=true",
    quiz_url: null,
    source: "manual",
    source_channel_id: null,
    source_imported_at: null,
    source_payload: null,
    source_published_at: null,
    source_reviewed_at: null,
    source_status: "active",
    source_synced_at: null,
    source_video_id: null,
    source_visibility: "unknown",
    ...overrides,
  }
}

describe("learning-modules", () => {
  it("requires internal quiz data when quiz mode is internal", () => {
    const result = adminModuleSchema.safeParse({
      moduleId: "aml-101",
      title: "AML Basics",
      objective: "Learn the essentials",
      moduleType: "VIDEO",
      durationMins: 15,
      contentEmbedUrl: "https://www.youtube.com/embed/example",
      owner: "Compliance",
      badges: ["MANDATORY"],
      teams: ["LMT"],
      status: "draft",
      sortOrder: 10,
      quizMode: "internal",
    })

    expect(result.success).toBe(false)
  })

  it("maps learner payload with assignment metadata and active external quiz fields", () => {
    const payload = mapModuleRowToLearnerModule(createModuleRow(), {
      assigned: true,
      dueDate: "2026-03-20",
    })

    expect(payload).toMatchObject({
      id: "aml-101",
      badges: "MANDATORY,NEW",
      teams: "LMT,BA",
      due_date: "2026-03-20",
      assigned: true,
      quiz_embed_url: "https://docs.google.com/forms/d/e/example/viewform?embedded=true",
      quiz_url: null,
    })
  })

  it("aggregates module metrics across assignments, events, and quiz attempts", () => {
    const metrics = buildModuleMetrics(
      [createModuleRow()],
      [{ module_id: "aml-101" }, { module_id: "aml-101" }],
      [
        { module_id: "aml-101", event_type: "module_view" },
        { module_id: "aml-101", event_type: "module_view" },
        { module_id: "aml-101", event_type: "module_complete" },
      ],
      [
        { module_id: "aml-101", score: 80 },
        { module_id: "aml-101", score: 100 },
      ],
    )

    expect(metrics.get("aml-101")).toEqual({
      assignmentCount: 2,
      views: 2,
      completions: 1,
      attempts: 2,
      avgScore: 90,
    })
  })
})
