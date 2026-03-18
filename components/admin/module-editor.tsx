"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

type ModuleStatus = "draft" | "published" | "archived"
type ModuleType = "VIDEO" | "DOC" | "SLIDES"
type ModuleBadge = "MANDATORY" | "NEW" | "UPDATED"
type QuizMode = "none" | "internal" | "external_embed" | "external_link"
type QuestionType = "multiple-choice" | "true-false" | "multi-select"
type ModuleSource = "manual" | "youtube"
type ModuleSourceVisibility = "unlisted" | "public" | "private" | "unknown"
type ModuleSourceStatus = "active" | "removed" | "error"

type TeamOption = { id: string; name: string; is_active: boolean; sort_order: number }
type QuestionOption = { id: string; text: string }
type QuestionState = { id: string; type: QuestionType; text: string; explanation: string; options: QuestionOption[]; correctAnswers: string[]; variantGroup: string }
type ModuleSourceMeta = {
  source: ModuleSource
  sourceVideoId: string | null
  sourceChannelId: string | null
  sourceVisibility: ModuleSourceVisibility
  sourceStatus: ModuleSourceStatus
  sourceImportedAt: string | null
  sourceSyncedAt: string | null
  sourceReviewedAt: string | null
  openUrl: string | null
}

type ModuleFormState = {
  moduleId: string
  title: string
  objective: string
  description: string
  moduleType: ModuleType
  durationMins: string
  contentEmbedUrl: string
  openUrl: string
  thumbnailUrl: string
  owner: string
  badges: ModuleBadge[]
  teams: string[]
  status: ModuleStatus
  sortOrder: string
  source: ModuleSource
  sourceVideoId: string | null
  sourceChannelId: string | null
  sourceVisibility: ModuleSourceVisibility
  sourceStatus: ModuleSourceStatus
  sourceImportedAt: string | null
  sourceSyncedAt: string | null
  sourceReviewedAt: string | null
  quizMode: QuizMode
  quizEmbedUrl: string
  quizUrl: string
  quizTitle: string
  quizPassingScore: string
  questions: QuestionState[]
  removeInternalQuiz: boolean
}

type ModuleDetailResponse = {
  module: {
    moduleId: string
    title: string
    objective: string
    description: string | null
    moduleType: ModuleType
    durationMins: number
    contentEmbedUrl: string
    openUrl: string | null
    thumbnailUrl: string | null
    owner: string
    badges: ModuleBadge[]
    teams: string[]
    status: ModuleStatus
    sortOrder: number
    source: ModuleSource
    sourceVideoId: string | null
    sourceChannelId: string | null
    sourceVisibility: ModuleSourceVisibility
    sourceStatus: ModuleSourceStatus
    sourceImportedAt: string | null
    sourceSyncedAt: string | null
    sourceReviewedAt: string | null
    quizMode: QuizMode
    quizEmbedUrl: string | null
    quizUrl: string | null
  }
  quiz: {
    title: string
    passingScore: number
    questions: Array<{ id: string; type: QuestionType; text: string; options: QuestionOption[]; correctAnswers: string[]; explanation?: string; variantGroup?: string | null }>
  } | null
  hasStoredInternalQuiz: boolean
}

type QuizGenerationResponse = {
  quiz: {
    title: string
    passingScore: number
    questions: QuestionState[]
  }
  contextSource: "transcript+metadata" | "metadata"
  transcriptUsed: boolean
  transcriptLanguage: string | null
  warnings: string[]
  model: string
}

const moduleTypes: ModuleType[] = ["VIDEO", "DOC", "SLIDES"]
const badgeOptions: ModuleBadge[] = ["MANDATORY", "NEW", "UPDATED"]
const quizModes: Array<{ value: QuizMode; label: string }> = [
  { value: "none", label: "No quiz" },
  { value: "internal", label: "Internal quiz" },
  { value: "external_embed", label: "External embedded quiz" },
  { value: "external_link", label: "External linked quiz" },
]
const questionTypes: Array<{ value: QuestionType; label: string }> = [
  { value: "multiple-choice", label: "Multiple choice" },
  { value: "true-false", label: "True / False" },
  { value: "multi-select", label: "Multi select" },
]

function makeId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
}

function trueFalseOptions(): QuestionOption[] {
  return [{ id: "true", text: "True" }, { id: "false", text: "False" }]
}

function createQuestion(type: QuestionType = "multiple-choice"): QuestionState {
  if (type === "true-false") {
    return { id: makeId("q"), type, text: "", explanation: "", options: trueFalseOptions(), correctAnswers: ["true"], variantGroup: "" }
  }

  const firstId = makeId("o")
  const secondId = makeId("o")
  return {
    id: makeId("q"),
    type,
    text: "",
    explanation: "",
    options: [{ id: firstId, text: "" }, { id: secondId, text: "" }],
    correctAnswers: [firstId],
    variantGroup: "",
  }
}

function defaultFormState(): ModuleFormState {
  return {
    moduleId: "",
    title: "",
    objective: "",
    description: "",
    moduleType: "VIDEO",
    durationMins: "10",
    contentEmbedUrl: "",
    openUrl: "",
    thumbnailUrl: "",
    owner: "",
    badges: [],
    teams: [],
    status: "draft",
    sortOrder: "0",
    source: "manual",
    sourceVideoId: null,
    sourceChannelId: null,
    sourceVisibility: "unknown",
    sourceStatus: "active",
    sourceImportedAt: null,
    sourceSyncedAt: null,
    sourceReviewedAt: null,
    quizMode: "none",
    quizEmbedUrl: "",
    quizUrl: "",
    quizTitle: "",
    quizPassingScore: "80",
    questions: [createQuestion()],
    removeInternalQuiz: false,
  }
}

function mapDetailToForm(detail: ModuleDetailResponse, duplicate: boolean): ModuleFormState {
  const fallback = defaultFormState()
  return {
    ...fallback,
    moduleId: duplicate ? `${detail.module.moduleId}-copy` : detail.module.moduleId,
    title: duplicate ? `${detail.module.title} (Copy)` : detail.module.title,
    objective: detail.module.objective,
    description: detail.module.description || "",
    moduleType: detail.module.moduleType,
    durationMins: String(detail.module.durationMins),
    contentEmbedUrl: detail.module.contentEmbedUrl,
    openUrl: detail.module.openUrl || "",
    thumbnailUrl: detail.module.thumbnailUrl || "",
    owner: detail.module.owner,
    badges: detail.module.badges,
    teams: detail.module.teams,
    status: duplicate ? "draft" : detail.module.status,
    sortOrder: String(detail.module.sortOrder),
    source: detail.module.source,
    sourceVideoId: detail.module.sourceVideoId,
    sourceChannelId: detail.module.sourceChannelId,
    sourceVisibility: detail.module.sourceVisibility,
    sourceStatus: detail.module.sourceStatus,
    sourceImportedAt: detail.module.sourceImportedAt,
    sourceSyncedAt: detail.module.sourceSyncedAt,
    sourceReviewedAt: detail.module.sourceReviewedAt,
    quizMode: detail.module.quizMode,
    quizEmbedUrl: detail.module.quizEmbedUrl || "",
    quizUrl: detail.module.quizUrl || "",
    quizTitle: detail.quiz?.title || detail.module.title,
    quizPassingScore: String(detail.quiz?.passingScore ?? 80),
    questions: detail.quiz?.questions?.length ? detail.quiz.questions.map((q) => ({ id: q.id, type: q.type, text: q.text, explanation: q.explanation || "", options: q.options, correctAnswers: q.correctAnswers, variantGroup: q.variantGroup || "" })) : fallback.questions,
    removeInternalQuiz: false,
  }
}

export function ModuleEditor({ mode, moduleId }: { mode: "create" | "edit"; moduleId?: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const duplicateFrom = mode === "create" ? searchParams.get("duplicate") : null

  const [form, setForm] = React.useState<ModuleFormState>(() => defaultFormState())
  const [teams, setTeams] = React.useState<TeamOption[]>([])
  const [loading, setLoading] = React.useState(mode === "edit" || Boolean(duplicateFrom))
  const [saving, setSaving] = React.useState(false)
  const [addingTeam, setAddingTeam] = React.useState(false)
  const [generatingQuiz, setGeneratingQuiz] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)
  const [newTeamName, setNewTeamName] = React.useState("")
  const [quizGenerationNotes, setQuizGenerationNotes] = React.useState("")
  const [hasStoredInternalQuiz, setHasStoredInternalQuiz] = React.useState(false)
  const [sourceMeta, setSourceMeta] = React.useState<ModuleSourceMeta | null>(null)

  React.useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(mode === "edit" || Boolean(duplicateFrom))
      setError(null)
      try {
        const teamsResponse = await fetch("/api/admin/teams", { cache: "no-store" })
        if (!teamsResponse.ok) throw new Error("Failed to load teams")
        const teamsPayload = (await teamsResponse.json()) as { teams?: TeamOption[] }
        if (!cancelled) setTeams(teamsPayload.teams || [])

        const sourceId = mode === "edit" ? moduleId : duplicateFrom
        if (!sourceId) {
          if (!cancelled) setLoading(false)
          return
        }

        const detailResponse = await fetch(`/api/admin/modules/${encodeURIComponent(sourceId)}`, { cache: "no-store" })
        if (!detailResponse.ok) throw new Error("Failed to load module")
        const detail = (await detailResponse.json()) as ModuleDetailResponse
        if (!cancelled) {
          setForm(mapDetailToForm(detail, mode === "create" && Boolean(duplicateFrom)))
          setHasStoredInternalQuiz(detail.hasStoredInternalQuiz)
          setSourceMeta(mode === "edit" ? {
            source: detail.module.source,
            sourceVideoId: detail.module.sourceVideoId,
            sourceChannelId: detail.module.sourceChannelId,
            sourceVisibility: detail.module.sourceVisibility,
            sourceStatus: detail.module.sourceStatus,
            sourceImportedAt: detail.module.sourceImportedAt,
            sourceSyncedAt: detail.module.sourceSyncedAt,
            sourceReviewedAt: detail.module.sourceReviewedAt,
            openUrl: detail.module.openUrl,
          } : null)
          setLoading(false)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load module")
          setSourceMeta(null)
          setLoading(false)
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [duplicateFrom, mode, moduleId])

  const activeTeams = React.useMemo(() => teams.filter((team) => team.is_active).sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)), [teams])
  const isYoutubeModule = sourceMeta?.source === "youtube"
  const setField = <K extends keyof ModuleFormState>(key: K, value: ModuleFormState[K]) => setForm((current) => ({ ...current, [key]: value }))
  const toggleBadge = (badge: ModuleBadge) => setForm((current) => ({ ...current, badges: current.badges.includes(badge) ? current.badges.filter((item) => item !== badge) : [...current.badges, badge] }))
  const toggleTeam = (teamName: string) => setForm((current) => ({ ...current, teams: current.teams.includes(teamName) ? current.teams.filter((item) => item !== teamName) : [...current.teams, teamName] }))
  const updateQuestion = (questionId: string, updater: (question: QuestionState) => QuestionState) => setForm((current) => ({ ...current, questions: current.questions.map((question) => question.id === questionId ? updater(question) : question) }))
  const addQuestion = () => setForm((current) => ({ ...current, questions: [...current.questions, createQuestion()] }))
  const removeQuestion = (questionId: string) => setForm((current) => ({ ...current, questions: current.questions.length > 1 ? current.questions.filter((question) => question.id !== questionId) : current.questions }))
  const changeQuestionType = (questionId: string, nextType: QuestionType) => {
    updateQuestion(questionId, (question) => {
      if (nextType === "true-false") {
        return { ...question, type: nextType, options: trueFalseOptions(), correctAnswers: [question.correctAnswers[0] === "false" ? "false" : "true"] }
      }
      const options = question.options.length >= 2 ? question.options : createQuestion(nextType).options
      const validCorrectAnswers = question.correctAnswers.filter((answer) => options.some((option) => option.id === answer))
      return { ...question, type: nextType, options, correctAnswers: nextType === "multi-select" ? (validCorrectAnswers.length ? validCorrectAnswers : [options[0].id]) : [validCorrectAnswers[0] || options[0].id] }
    })
  }

  const addOption = (questionId: string) => updateQuestion(questionId, (question) => ({ ...question, options: [...question.options, { id: makeId("o"), text: "" }] }))
  const removeOption = (questionId: string, optionId: string) => updateQuestion(questionId, (question) => {
    if (question.type === "true-false" || question.options.length <= 2) return question
    const nextOptions = question.options.filter((option) => option.id !== optionId)
    const nextCorrectAnswers = question.correctAnswers.filter((answer) => answer !== optionId)
    return { ...question, options: nextOptions, correctAnswers: nextCorrectAnswers.length ? nextCorrectAnswers : [nextOptions[0].id] }
  })
  const toggleCorrectAnswer = (questionId: string, optionId: string) => updateQuestion(questionId, (question) => {
    if (question.type === "multi-select") {
      const nextCorrectAnswers = question.correctAnswers.includes(optionId) ? question.correctAnswers.filter((answer) => answer !== optionId) : [...question.correctAnswers, optionId]
      return { ...question, correctAnswers: nextCorrectAnswers.length ? nextCorrectAnswers : [optionId] }
    }
    return { ...question, correctAnswers: [optionId] }
  })

  const addTeam = async () => {
    if (!newTeamName.trim()) return
    setAddingTeam(true)
    setError(null)
    try {
      const response = await fetch("/api/admin/teams", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newTeamName.trim() }) })
      if (!response.ok) throw new Error("Failed to create team")
      const payload = (await response.json()) as { team: TeamOption }
      setTeams((current) => current.some((team) => team.name === payload.team.name) ? current.map((team) => team.name === payload.team.name ? payload.team : team) : [...current, payload.team])
      setForm((current) => ({ ...current, teams: current.teams.includes(payload.team.name) ? current.teams : [...current.teams, payload.team.name] }))
      setNewTeamName("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create team")
    } finally {
      setAddingTeam(false)
    }
  }

  const handleGenerateQuiz = async () => {
    const generationTargetId = mode === "edit" ? moduleId : duplicateFrom
    if (!generationTargetId) {
      setError("Save the module once before generating a quiz draft.")
      return
    }

    const hasDraftWork =
      form.quizMode === "internal" &&
      form.questions.some((question) =>
        question.text.trim() ||
        question.explanation.trim() ||
        question.options.some((option) => option.text.trim()),
      )

    if (hasDraftWork && typeof window !== "undefined") {
      const shouldReplace = window.confirm("Generate a new quiz draft and replace the current unsaved quiz questions?")
      if (!shouldReplace) return
    }

    setGeneratingQuiz(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch(`/api/admin/modules/${encodeURIComponent(generationTargetId)}/generate-quiz`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          objective: form.objective.trim(),
          description: form.description.trim() || null,
          owner: form.owner.trim(),
          durationMins: Number(form.durationMins),
          moduleType: form.moduleType,
          teams: form.teams,
          badges: form.badges,
          openUrl: form.openUrl.trim() || null,
          contentEmbedUrl: form.contentEmbedUrl.trim() || null,
          source: form.source,
          sourceVideoId: form.sourceVideoId,
          generationNotes: quizGenerationNotes.trim() || null,
        }),
      })

      const payload = (await response.json().catch(() => ({}))) as QuizGenerationResponse & { error?: string }
      if (!response.ok) {
        throw new Error(payload.error || "Failed to generate quiz draft")
      }

      setForm((current) => ({
        ...current,
        quizMode: "internal",
        quizTitle: payload.quiz.title,
        quizPassingScore: String(payload.quiz.passingScore),
        questions: payload.quiz.questions,
        removeInternalQuiz: false,
      }))

      const contextMessage = payload.transcriptUsed
        ? `Quiz draft generated from transcript${payload.transcriptLanguage ? ` (${payload.transcriptLanguage})` : ""}.`
        : "Quiz draft generated from metadata because no transcript was available."
      const warningMessage = payload.warnings.length ? ` ${payload.warnings.join(" ")}` : ""
      setSuccess(`${contextMessage} Review the questions before saving.${warningMessage}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate quiz draft")
    } finally {
      setGeneratingQuiz(false)
    }
  }

  const handleSubmit = async () => {
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const payload = {
        moduleId: form.moduleId.trim(),
        title: form.title.trim(),
        objective: form.objective.trim(),
        description: form.description.trim() || null,
        moduleType: form.moduleType,
        durationMins: Number(form.durationMins),
        contentEmbedUrl: form.contentEmbedUrl.trim(),
        openUrl: form.openUrl.trim() || null,
        thumbnailUrl: form.thumbnailUrl.trim() || null,
        owner: form.owner.trim(),
        badges: form.badges,
        teams: form.teams,
        status: form.status,
        sortOrder: Number(form.sortOrder),
        quizMode: form.quizMode,
        quizEmbedUrl: form.quizEmbedUrl.trim() || null,
        quizUrl: form.quizUrl.trim() || null,
        quiz: form.quizMode === "internal" ? { title: form.quizTitle.trim() || form.title.trim(), passingScore: Number(form.quizPassingScore), questions: form.questions.map((question) => ({ id: question.id, type: question.type, text: question.text.trim(), explanation: question.explanation.trim() || undefined, variantGroup: question.variantGroup.trim() || undefined, options: question.options.map((option) => ({ id: option.id, text: option.text.trim() })), correctAnswers: question.correctAnswers })) } : null,
        removeInternalQuiz: form.removeInternalQuiz,
      }

      const endpoint = mode === "edit" ? `/api/admin/modules/${encodeURIComponent(moduleId || form.moduleId)}` : "/api/admin/modules"
      const method = mode === "edit" ? "PATCH" : "POST"
      const requestBody = mode === "edit" ? { title: payload.title, objective: payload.objective, description: payload.description, moduleType: payload.moduleType, durationMins: payload.durationMins, contentEmbedUrl: payload.contentEmbedUrl, openUrl: payload.openUrl, thumbnailUrl: payload.thumbnailUrl, owner: payload.owner, badges: payload.badges, teams: payload.teams, status: payload.status, sortOrder: payload.sortOrder, quizMode: payload.quizMode, quizEmbedUrl: payload.quizEmbedUrl, quizUrl: payload.quizUrl, quiz: payload.quiz, removeInternalQuiz: payload.removeInternalQuiz } : payload
      const response = await fetch(endpoint, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(requestBody) })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || "Failed to save module")

      if (mode === "create") {
        const nextModuleId = (result.module?.moduleId || payload.moduleId) as string
        router.push(`/admin/modules/${encodeURIComponent(nextModuleId)}`)
        router.refresh()
        return
      }

      const detail = result as ModuleDetailResponse
      if (detail.module) {
        setForm(mapDetailToForm(detail, false))
        setHasStoredInternalQuiz(detail.hasStoredInternalQuiz)
        setSourceMeta({
          source: detail.module.source,
          sourceVideoId: detail.module.sourceVideoId,
          sourceChannelId: detail.module.sourceChannelId,
          sourceVisibility: detail.module.sourceVisibility,
          sourceStatus: detail.module.sourceStatus,
          sourceImportedAt: detail.module.sourceImportedAt,
          sourceSyncedAt: detail.module.sourceSyncedAt,
          sourceReviewedAt: detail.module.sourceReviewedAt,
          openUrl: detail.module.openUrl,
        })
      }
      setSuccess("Module saved successfully.")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save module")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-neutral-400" /></div>
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link href="/admin/modules" className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white"><ArrowLeft className="h-4 w-4" />Back to Modules</Link>
          <h1 className="mt-3 text-3xl font-bold text-white">{mode === "edit" ? "Edit Module" : duplicateFrom ? "Duplicate Module" : "Create Module"}</h1>
          <p className="mt-1 text-neutral-400">Manage content, publishing workflow, audience metadata, and internal quizzes.</p>
        </div>
        <Button onClick={handleSubmit} disabled={saving} className="bg-emerald-600 text-white hover:bg-emerald-700">{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}{mode === "edit" ? "Save Changes" : "Create Module"}</Button>
      </div>

      {error && <div className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}
      {success && <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-300">{success}</div>}

      {isYoutubeModule && sourceMeta ? (
        <Card className="border-red-900/40 bg-neutral-900">
          <CardHeader>
            <CardTitle className="text-white">YouTube Source</CardTitle>
            <CardDescription className="text-neutral-400">
              Video metadata is owned by the YouTube sync. Review it here, then add internal metadata before publishing.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-neutral-500">Source</p>
              <p className="mt-2 text-sm text-white">{sourceMeta.source}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-neutral-500">Visibility</p>
              <p className="mt-2 text-sm text-white">{sourceMeta.sourceVisibility}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-neutral-500">Sync Status</p>
              <p className="mt-2 text-sm text-white">{sourceMeta.sourceStatus}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-neutral-500">Reviewed</p>
              <p className="mt-2 text-sm text-white">{sourceMeta.sourceReviewedAt ? new Date(sourceMeta.sourceReviewedAt).toLocaleString() : "Not yet reviewed"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-neutral-500">Video ID</p>
              <p className="mt-2 break-all text-sm text-white">{sourceMeta.sourceVideoId || "—"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-neutral-500">Channel ID</p>
              <p className="mt-2 break-all text-sm text-white">{sourceMeta.sourceChannelId || "—"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-neutral-500">Imported</p>
              <p className="mt-2 text-sm text-white">{sourceMeta.sourceImportedAt ? new Date(sourceMeta.sourceImportedAt).toLocaleString() : "—"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-neutral-500">Last Synced</p>
              <p className="mt-2 text-sm text-white">{sourceMeta.sourceSyncedAt ? new Date(sourceMeta.sourceSyncedAt).toLocaleString() : "—"}</p>
            </div>
            {sourceMeta.openUrl ? (
              <div className="md:col-span-2 xl:col-span-4">
                <Button asChild variant="outline" className="border-neutral-700 text-neutral-200 hover:bg-neutral-800">
                  <Link href={sourceMeta.openUrl} target="_blank" rel="noreferrer">
                    Open on YouTube
                  </Link>
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-neutral-800 bg-neutral-900"><CardHeader><CardTitle className="text-white">Details</CardTitle><CardDescription className="text-neutral-400">Core learner-facing metadata and immutable module ID.</CardDescription></CardHeader><CardContent className="grid gap-4 md:grid-cols-2">
        <div><label className="mb-2 block text-sm text-neutral-400">Module ID</label><Input value={form.moduleId} onChange={(event) => setField("moduleId", event.target.value)} disabled={mode === "edit"} className="border-neutral-700 bg-neutral-800 text-white" placeholder="e.g. aml-onboarding-001" /></div>
        <div><label className="mb-2 block text-sm text-neutral-400">Owner</label><Input value={form.owner} onChange={(event) => setField("owner", event.target.value)} disabled={isYoutubeModule} className="border-neutral-700 bg-neutral-800 text-white disabled:opacity-70" placeholder="e.g. Compliance Team" /></div>
        <div className="md:col-span-2"><label className="mb-2 block text-sm text-neutral-400">Title</label><Input value={form.title} onChange={(event) => setField("title", event.target.value)} disabled={isYoutubeModule} className="border-neutral-700 bg-neutral-800 text-white disabled:opacity-70" /></div>
        <div className="md:col-span-2"><label className="mb-2 block text-sm text-neutral-400">Objective</label><Textarea value={form.objective} onChange={(event) => setField("objective", event.target.value)} className="min-h-[100px] border-neutral-700 bg-neutral-800 text-white" /></div>
        <div className="md:col-span-2"><label className="mb-2 block text-sm text-neutral-400">Description</label><Textarea value={form.description} onChange={(event) => setField("description", event.target.value)} disabled={isYoutubeModule} className="min-h-[120px] border-neutral-700 bg-neutral-800 text-white disabled:opacity-70" placeholder="Optional long-form description" /></div>
        <div><label className="mb-2 block text-sm text-neutral-400">Module Type</label><select value={form.moduleType} onChange={(event) => setField("moduleType", event.target.value as ModuleType)} disabled={isYoutubeModule} className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-white disabled:opacity-70">{moduleTypes.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
        <div><label className="mb-2 block text-sm text-neutral-400">Duration (minutes)</label><Input type="number" min="0" value={form.durationMins} onChange={(event) => setField("durationMins", event.target.value)} disabled={isYoutubeModule} className="border-neutral-700 bg-neutral-800 text-white disabled:opacity-70" /></div>
        <div className="md:col-span-2"><label className="mb-2 block text-sm text-neutral-400">Badges</label><div className="flex flex-wrap gap-2">{badgeOptions.map((badge) => { const selected = form.badges.includes(badge); return <button key={badge} type="button" onClick={() => toggleBadge(badge)} className={`rounded-full border px-3 py-1 text-sm transition-colors ${selected ? "border-emerald-500 bg-emerald-500/10 text-emerald-300" : "border-neutral-700 bg-neutral-950 text-neutral-300 hover:border-neutral-500"}`}>{badge}</button> })}</div></div>
      </CardContent></Card>

      <Card className="border-neutral-800 bg-neutral-900"><CardHeader><CardTitle className="text-white">Content</CardTitle><CardDescription className="text-neutral-400">URL-based content delivery for video, documents, or slides.</CardDescription></CardHeader><CardContent className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2"><label className="mb-2 block text-sm text-neutral-400">Content Embed URL</label><Input value={form.contentEmbedUrl} onChange={(event) => setField("contentEmbedUrl", event.target.value)} disabled={isYoutubeModule} className="border-neutral-700 bg-neutral-800 text-white disabled:opacity-70" placeholder="https://www.youtube.com/embed/..." /></div>
        <div><label className="mb-2 block text-sm text-neutral-400">Open URL</label><Input value={form.openUrl} onChange={(event) => setField("openUrl", event.target.value)} disabled={isYoutubeModule} className="border-neutral-700 bg-neutral-800 text-white disabled:opacity-70" placeholder="Optional external link" /></div>
        <div><label className="mb-2 block text-sm text-neutral-400">Thumbnail URL</label><Input value={form.thumbnailUrl} onChange={(event) => setField("thumbnailUrl", event.target.value)} disabled={isYoutubeModule} className="border-neutral-700 bg-neutral-800 text-white disabled:opacity-70" placeholder="Optional image preview" /></div>
      </CardContent></Card>
      <Card className="border-neutral-800 bg-neutral-900"><CardHeader><CardTitle className="text-white">Audience Metadata</CardTitle><CardDescription className="text-neutral-400">Team taxonomy is stored in Supabase and can be extended inline.</CardDescription></CardHeader><CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-[2fr_auto]">
          <Input value={newTeamName} onChange={(event) => setNewTeamName(event.target.value)} className="border-neutral-700 bg-neutral-800 text-white" placeholder="Add a new team name" />
          <Button type="button" variant="outline" className="border-neutral-700 text-neutral-200 hover:bg-neutral-800" onClick={addTeam} disabled={addingTeam}>{addingTeam ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}Add Team</Button>
        </div>
        <div className="flex flex-wrap gap-2">{activeTeams.map((team) => { const selected = form.teams.includes(team.name); return <button key={team.id} type="button" onClick={() => toggleTeam(team.name)} className={`rounded-full border px-3 py-1 text-sm transition-colors ${selected ? "border-emerald-500 bg-emerald-500/10 text-emerald-300" : "border-neutral-700 bg-neutral-950 text-neutral-300 hover:border-neutral-500"}`}>{team.name}</button> })}</div>
        {form.teams.length > 0 && <div className="flex flex-wrap gap-2 pt-2">{form.teams.map((team) => <Badge key={team} variant="secondary" className="bg-neutral-800 text-neutral-200">{team}</Badge>)}</div>}
      </CardContent></Card>

      <Card className="border-neutral-800 bg-neutral-900"><CardHeader><CardTitle className="text-white">Quiz</CardTitle><CardDescription className="text-neutral-400">Internal quiz authoring plus external embed/link compatibility.</CardDescription></CardHeader><CardContent className="space-y-4">
        <div><label className="mb-2 block text-sm text-neutral-400">Quiz Mode</label><select value={form.quizMode} onChange={(event) => setField("quizMode", event.target.value as QuizMode)} className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-white">{quizModes.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>
        {(mode === "edit" || Boolean(duplicateFrom)) && (
          <div className="rounded-lg border border-neutral-800 bg-neutral-950/40 p-4 space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-medium text-white">AI Quiz Draft</p>
                <p className="text-sm text-neutral-400">Generate an internal quiz draft from the synced YouTube transcript when available. If captions are missing, provide source notes or transcript text below before generating.</p>
              </div>
              <Button type="button" variant="outline" className="border-neutral-700 text-neutral-200 hover:bg-neutral-800" onClick={handleGenerateQuiz} disabled={generatingQuiz}>
                {generatingQuiz ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Generate Quiz Draft
              </Button>
            </div>
            <div>
              <label className="mb-2 block text-sm text-neutral-400">Generation Notes / Transcript Override</label>
              <Textarea value={quizGenerationNotes} onChange={(event) => setQuizGenerationNotes(event.target.value)} className="min-h-[110px] border-neutral-700 bg-neutral-800 text-white" placeholder="If the video has no captions, paste at least 80 words of transcript, summary, or key learning notes here." />
            </div>
          </div>
        )}
        {form.quizMode === "external_embed" && <div><label className="mb-2 block text-sm text-neutral-400">Quiz Embed URL</label><Input value={form.quizEmbedUrl} onChange={(event) => setField("quizEmbedUrl", event.target.value)} className="border-neutral-700 bg-neutral-800 text-white" placeholder="https://docs.google.com/forms/.../viewform?embedded=true" /></div>}
        {form.quizMode === "external_link" && <div><label className="mb-2 block text-sm text-neutral-400">Quiz URL</label><Input value={form.quizUrl} onChange={(event) => setField("quizUrl", event.target.value)} className="border-neutral-700 bg-neutral-800 text-white" placeholder="https://forms.gle/..." /></div>}
        {form.quizMode === "internal" && <div className="space-y-6 rounded-lg border border-neutral-800 bg-neutral-950/40 p-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div><label className="mb-2 block text-sm text-neutral-400">Quiz Title</label><Input value={form.quizTitle} onChange={(event) => setField("quizTitle", event.target.value)} className="border-neutral-700 bg-neutral-800 text-white" /></div>
            <div><label className="mb-2 block text-sm text-neutral-400">Passing Score</label><Input type="number" min="0" max="100" value={form.quizPassingScore} onChange={(event) => setField("quizPassingScore", event.target.value)} className="border-neutral-700 bg-neutral-800 text-white" /></div>
          </div>
          <div className="space-y-4">{form.questions.map((question, index) => <div key={question.id} className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div><p className="text-sm font-medium text-white">Question {index + 1}</p><p className="text-xs text-neutral-500">{questionTypes.find((option) => option.value === question.type)?.label || question.type}</p></div>
              <div className="flex items-center gap-2">
                <select value={question.type} onChange={(event) => changeQuestionType(question.id, event.target.value as QuestionType)} className="rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-white">{questionTypes.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
                <Button type="button" variant="outline" size="sm" className="border-neutral-700 text-neutral-200 hover:bg-neutral-800" onClick={() => removeQuestion(question.id)} disabled={form.questions.length === 1}><Trash2 className="mr-2 h-4 w-4" />Remove</Button>
              </div>
            </div>
            <div className="mt-4 grid gap-4">
              <div><label className="mb-2 block text-sm text-neutral-400">Question Text</label><Textarea value={question.text} onChange={(event) => updateQuestion(question.id, (current) => ({ ...current, text: event.target.value }))} className="min-h-[90px] border-neutral-700 bg-neutral-800 text-white" /></div>
              <div>
                <label className="mb-2 block text-sm text-neutral-400">Variant Group (optional)</label>
                <Input
                  value={question.variantGroup}
                  onChange={(event) => updateQuestion(question.id, (current) => ({ ...current, variantGroup: event.target.value }))}
                  className="border-neutral-700 bg-neutral-800 text-white"
                  placeholder="Questions with the same group become alternatives; each learner gets one."
                />
              </div>
              <div><label className="mb-2 block text-sm text-neutral-400">Explanation (optional)</label><Textarea value={question.explanation} onChange={(event) => updateQuestion(question.id, (current) => ({ ...current, explanation: event.target.value }))} className="min-h-[80px] border-neutral-700 bg-neutral-800 text-white" /></div>
              <div className="space-y-3">
                <div className="flex items-center justify-between"><label className="block text-sm text-neutral-400">Options</label>{question.type !== "true-false" && <Button type="button" variant="outline" size="sm" className="border-neutral-700 text-neutral-200 hover:bg-neutral-800" onClick={() => addOption(question.id)}><Plus className="mr-2 h-4 w-4" />Add Option</Button>}</div>
                {question.options.map((option) => <div key={option.id} className="grid gap-3 rounded-md border border-neutral-800 bg-neutral-950/70 p-3 md:grid-cols-[auto_1fr_auto] md:items-center">
                  <label className="flex items-center gap-2 text-sm text-neutral-200"><input type={question.type === "multi-select" ? "checkbox" : "radio"} name={`correct-${question.id}`} checked={question.correctAnswers.includes(option.id)} onChange={() => toggleCorrectAnswer(question.id, option.id)} />Correct</label>
                  <Input value={option.text} onChange={(event) => updateQuestion(question.id, (current) => ({ ...current, options: current.options.map((currentOption) => currentOption.id === option.id ? { ...currentOption, text: event.target.value } : currentOption) }))} className="border-neutral-700 bg-neutral-800 text-white" />
                  <Button type="button" variant="outline" size="sm" className="border-neutral-700 text-neutral-200 hover:bg-neutral-800" onClick={() => removeOption(question.id, option.id)} disabled={question.type === "true-false" || question.options.length <= 2}><Trash2 className="h-4 w-4" /></Button>
                </div>)}
              </div>
            </div>
          </div>)}</div>
          <Button type="button" variant="outline" className="border-neutral-700 text-neutral-200 hover:bg-neutral-800" onClick={addQuestion}><Plus className="mr-2 h-4 w-4" />Add Question</Button>
        </div>}
        {hasStoredInternalQuiz && form.quizMode !== "internal" && <label className="flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200"><input type="checkbox" checked={form.removeInternalQuiz} onChange={(event) => setField("removeInternalQuiz", event.target.checked)} />Remove the stored internal quiz on save</label>}
      </CardContent></Card>

      <Card className="border-neutral-800 bg-neutral-900"><CardHeader><CardTitle className="text-white">Publishing</CardTitle><CardDescription className="text-neutral-400">Draft, publish, or archive without breaking assignment and reporting history.</CardDescription></CardHeader><CardContent className="grid gap-4 md:grid-cols-2">
        <div><label className="mb-2 block text-sm text-neutral-400">Status</label><select value={form.status} onChange={(event) => setField("status", event.target.value as ModuleStatus)} className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-white"><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></div>
        <div><label className="mb-2 block text-sm text-neutral-400">Sort Order</label><Input type="number" min="0" value={form.sortOrder} onChange={(event) => setField("sortOrder", event.target.value)} className="border-neutral-700 bg-neutral-800 text-white" /></div>
      </CardContent></Card>
    </div>
  )
}
