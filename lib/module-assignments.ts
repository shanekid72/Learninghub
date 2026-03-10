export type AssignmentRecord = {
  module_id: string
  due_date: string | null
}

export type AssignmentMeta = {
  assigned: true
  dueDate?: string
}

function normalizeDate(date: string | null): string | undefined {
  if (!date) return undefined
  return date.slice(0, 10)
}

export function buildModuleAssignmentMap(records: AssignmentRecord[]): Map<string, AssignmentMeta> {
  const assignmentMap = new Map<string, AssignmentMeta>()

  for (const record of records) {
    const moduleId = String(record.module_id)
    const dueDate = normalizeDate(record.due_date)
    const existing = assignmentMap.get(moduleId)

    if (!existing) {
      assignmentMap.set(moduleId, dueDate ? { assigned: true, dueDate } : { assigned: true })
      continue
    }

    if (dueDate && (!existing.dueDate || dueDate < existing.dueDate)) {
      existing.dueDate = dueDate
    }
  }

  return assignmentMap
}
