export type ModuleBadge = "MANDATORY" | "NEW" | "UPDATED"
export type ModuleType = "VIDEO" | "DOC" | "SLIDES"
export type ModuleQuizMode = "none" | "internal" | "external_embed" | "external_link"

export interface Module {
  id: number | string
  title: string
  objective: string
  description?: string
  durationMins: number
  type: ModuleType
  badges?: ModuleBadge[]
  teams: string[]
  progress: number
  dueDate?: string
  contentEmbedUrl: string
  openUrl?: string
  thumbnailUrl?: string
  quizMode?: ModuleQuizMode
  quizEmbedUrl?: string
  quizUrl?: string
  lastUpdated: string
  owner: string
  saved?: boolean
  assigned?: boolean
}
