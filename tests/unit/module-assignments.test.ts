import { describe, expect, it } from "vitest"
import { buildModuleAssignmentMap } from "@/lib/module-assignments"

describe("module-assignments", () => {
  it("marks modules as assigned", () => {
    const map = buildModuleAssignmentMap([
      { module_id: "mod-1", due_date: null },
      { module_id: "mod-2", due_date: "2026-03-10" },
    ])

    expect(map.get("mod-1")).toEqual({ assigned: true })
    expect(map.get("mod-2")).toEqual({ assigned: true, dueDate: "2026-03-10" })
  })

  it("keeps earliest due date when multiple assignments exist", () => {
    const map = buildModuleAssignmentMap([
      { module_id: "mod-1", due_date: "2026-03-20" },
      { module_id: "mod-1", due_date: "2026-03-10" },
      { module_id: "mod-1", due_date: "2026-03-14" },
    ])

    expect(map.get("mod-1")).toEqual({ assigned: true, dueDate: "2026-03-10" })
  })
})
