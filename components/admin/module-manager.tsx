"use client"

import * as React from "react"
import Link from "next/link"
import {
  Archive,
  Copy,
  Edit,
  ExternalLink,
  Eye,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Upload,
  Youtube,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type ModuleStatus = "draft" | "published" | "archived"
type ModuleType = "VIDEO" | "DOC" | "SLIDES"
type ModuleBadge = "MANDATORY" | "NEW" | "UPDATED"
type QuizMode = "none" | "internal" | "external_embed" | "external_link"
type ModuleSource = "manual" | "youtube"
type ModuleSourceVisibility = "unlisted" | "public" | "private" | "unknown"
type ModuleSourceStatus = "active" | "removed" | "error"

type ModuleMetrics = {
  assignmentCount: number
  views: number
  completions: number
  attempts: number
  avgScore: number
}

type ModuleListItem = {
  moduleId: string
  title: string
  objective: string
  moduleType: ModuleType
  owner: string
  openUrl: string | null
  badges: ModuleBadge[]
  teams: string[]
  status: ModuleStatus
  sortOrder: number
  updatedAt: string
  createdAt: string
  source: ModuleSource
  sourceVideoId: string | null
  sourceChannelId: string | null
  sourceVisibility: ModuleSourceVisibility
  sourceStatus: ModuleSourceStatus
  sourceImportedAt: string | null
  sourceSyncedAt: string | null
  sourceReviewedAt: string | null
  quizMode: QuizMode
  metrics: ModuleMetrics
}

type ModuleListResponse = {
  modules: ModuleListItem[]
}

type TeamResponse = {
  teams: Array<{ id: string; name: string; is_active: boolean; sort_order: number }>
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
    questions: Array<{
      id: string
      type: "multiple-choice" | "true-false" | "multi-select"
      text: string
      options: Array<{ id: string; text: string }>
      correctAnswers: string[]
      explanation?: string
    }>
  } | null
  hasStoredInternalQuiz: boolean
}

type YoutubeSyncStatusResponse = {
  enabled: boolean
  configured: boolean
  channelId: string | null
  lookbackHours: number
  pendingReviewCount: number
  state: {
    lastCheckedAt: string | null
    lastSuccessAt: string | null
    lastSeenVideoPublishedAt: string | null
    lastError: string | null
    lastErrorFingerprint: string | null
    uploadsPlaylistId: string | null
  } | null
}

type YoutubeSyncResponse = YoutubeSyncStatusResponse & {
  success: boolean
  skipped?: string
  trigger: "manual" | "cron"
  channelTitle: string | null
  stats: {
    scanned: number
    imported: number
    updated: number
    markedRemoved: number
    skippedIneligible: number
    failed: number
    notifiedAdmins: number
  }
  importedVideos: Array<{ moduleId: string; title: string; videoId: string }>
}

const statusOptions: Array<{ value: string; label: string }> = [
  { value: "all", label: "All Statuses" },
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
]

const moduleTypeOptions: Array<{ value: string; label: string }> = [
  { value: "all", label: "All Types" },
  { value: "VIDEO", label: "Video" },
  { value: "DOC", label: "Document" },
  { value: "SLIDES", label: "Slides" },
]

const badgeOptions: Array<{ value: string; label: string }> = [
  { value: "all", label: "All Badges" },
  { value: "MANDATORY", label: "Mandatory" },
  { value: "NEW", label: "New" },
  { value: "UPDATED", label: "Updated" },
]

const sourceOptions: Array<{ value: string; label: string }> = [
  { value: "all", label: "All Sources" },
  { value: "manual", label: "Manual" },
  { value: "youtube", label: "YouTube" },
]

const syncStatusOptions: Array<{ value: string; label: string }> = [
  { value: "all", label: "All Sync States" },
  { value: "active", label: "Active" },
  { value: "removed", label: "Removed" },
  { value: "error", label: "Error" },
]

const visibilityOptions: Array<{ value: string; label: string }> = [
  { value: "all", label: "All Visibility" },
  { value: "unlisted", label: "Unlisted" },
  { value: "public", label: "Public" },
  { value: "private", label: "Private" },
  { value: "unknown", label: "Unknown" },
]

function statusBadgeClass(status: ModuleStatus) {
  if (status === "published") return "bg-emerald-900/40 text-emerald-300"
  if (status === "archived") return "bg-amber-900/40 text-amber-300"
  return "bg-neutral-800 text-neutral-300"
}

function contentTypeBadgeClass(type: ModuleType) {
  if (type === "VIDEO") return "bg-blue-900/40 text-blue-300"
  if (type === "SLIDES") return "bg-fuchsia-900/40 text-fuchsia-300"
  return "bg-cyan-900/40 text-cyan-300"
}

function moduleBadgeClass(badge: ModuleBadge) {
  if (badge === "MANDATORY") return "bg-red-900/40 text-red-300"
  if (badge === "NEW") return "bg-emerald-900/40 text-emerald-300"
  return "bg-amber-900/40 text-amber-300"
}

function sourceBadgeClass(source: ModuleSource) {
  return source === "youtube"
    ? "bg-red-900/30 text-red-300"
    : "bg-neutral-800 text-neutral-300"
}

function visibilityBadgeClass(visibility: ModuleSourceVisibility) {
  if (visibility === "unlisted") return "bg-sky-900/30 text-sky-300"
  if (visibility === "public") return "bg-emerald-900/30 text-emerald-300"
  if (visibility === "private") return "bg-amber-900/30 text-amber-300"
  return "bg-neutral-800 text-neutral-300"
}

function syncBadgeClass(syncStatus: ModuleSourceStatus) {
  if (syncStatus === "active") return "bg-emerald-900/40 text-emerald-300"
  if (syncStatus === "removed") return "bg-amber-900/40 text-amber-300"
  return "bg-red-900/40 text-red-300"
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—"
  return new Date(value).toLocaleString()
}

function toPatchPayload(detail: ModuleDetailResponse, status: ModuleStatus) {
  return {
    title: detail.module.title,
    objective: detail.module.objective,
    description: detail.module.description,
    moduleType: detail.module.moduleType,
    durationMins: detail.module.durationMins,
    contentEmbedUrl: detail.module.contentEmbedUrl,
    openUrl: detail.module.openUrl,
    thumbnailUrl: detail.module.thumbnailUrl,
    owner: detail.module.owner,
    badges: detail.module.badges,
    teams: detail.module.teams,
    status,
    sortOrder: detail.module.sortOrder,
    quizMode: detail.module.quizMode,
    quizEmbedUrl: detail.module.quizEmbedUrl,
    quizUrl: detail.module.quizUrl,
    quiz: detail.quiz,
    removeInternalQuiz: false,
  }
}

export function ModuleManager() {
  const [modules, setModules] = React.useState<ModuleListItem[]>([])
  const [teamOptions, setTeamOptions] = React.useState<string[]>([])
  const [loading, setLoading] = React.useState(true)
  const [syncing, setSyncing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [syncResult, setSyncResult] = React.useState<YoutubeSyncResponse | null>(null)
  const [syncStatus, setSyncStatus] = React.useState<YoutubeSyncStatusResponse | null>(null)
  const [actionKey, setActionKey] = React.useState<string | null>(null)

  const [search, setSearch] = React.useState("")
  const [status, setStatus] = React.useState("all")
  const [moduleType, setModuleType] = React.useState("all")
  const [badge, setBadge] = React.useState("all")
  const [team, setTeam] = React.useState("all")
  const [source, setSource] = React.useState("all")
  const [visibility, setVisibility] = React.useState("all")
  const [syncStatusFilter, setSyncStatusFilter] = React.useState("all")

  const loadSyncStatus = React.useCallback(async () => {
    const response = await fetch("/api/admin/youtube/sync/status", { cache: "no-store" })
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}))
      throw new Error(payload.error || "Failed to load YouTube sync status")
    }
    const payload = (await response.json()) as YoutubeSyncStatusResponse
    setSyncStatus(payload)
  }, [])

  const loadModules = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (search.trim()) params.set("search", search.trim())
      if (status !== "all") params.set("status", status)
      if (moduleType !== "all") params.set("type", moduleType)
      if (badge !== "all") params.set("badge", badge)
      if (team !== "all") params.set("team", team)
      if (source !== "all") params.set("source", source)
      if (visibility !== "all") params.set("visibility", visibility)
      if (syncStatusFilter !== "all") params.set("syncStatus", syncStatusFilter)

      const [modulesResponse, teamsResponse] = await Promise.all([
        fetch(`/api/admin/modules${params.size ? `?${params.toString()}` : ""}`, { cache: "no-store" }),
        fetch("/api/admin/teams", { cache: "no-store" }),
      ])

      if (!modulesResponse.ok) {
        const payload = await modulesResponse.json().catch(() => ({}))
        throw new Error(payload.error || "Failed to load modules")
      }
      if (!teamsResponse.ok) {
        const payload = await teamsResponse.json().catch(() => ({}))
        throw new Error(payload.error || "Failed to load teams")
      }

      const modulesPayload = (await modulesResponse.json()) as ModuleListResponse
      const teamsPayload = (await teamsResponse.json()) as TeamResponse
      setModules(modulesPayload.modules || [])
      setTeamOptions(
        (teamsPayload.teams || [])
          .filter((teamItem) => teamItem.is_active)
          .map((teamItem) => teamItem.name),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load modules")
    } finally {
      setLoading(false)
    }
  }, [badge, moduleType, search, source, status, syncStatusFilter, team, visibility])

  React.useEffect(() => {
    void Promise.all([loadModules(), loadSyncStatus()]).catch((err) => {
      setError(err instanceof Error ? err.message : "Failed to load module manager")
    })
  }, [loadModules, loadSyncStatus])

  const handleSyncNow = async () => {
    setSyncing(true)
    setError(null)
    setSyncResult(null)
    try {
      const response = await fetch("/api/admin/youtube/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
      const payload = (await response.json()) as YoutubeSyncResponse & { error?: string }
      if (!response.ok) {
        throw new Error(payload.error || payload.state?.lastError || "YouTube sync failed")
      }
      setSyncResult(payload)
      await Promise.all([loadModules(), loadSyncStatus()])
    } catch (err) {
      setError(err instanceof Error ? err.message : "YouTube sync failed")
    } finally {
      setSyncing(false)
    }
  }

  const updateStatus = async (moduleId: string, nextStatus: ModuleStatus) => {
    setActionKey(`${moduleId}:${nextStatus}`)
    setError(null)
    try {
      const detailResponse = await fetch(`/api/admin/modules/${encodeURIComponent(moduleId)}`, { cache: "no-store" })
      if (!detailResponse.ok) {
        const payload = await detailResponse.json().catch(() => ({}))
        throw new Error(payload.error || "Failed to load module detail")
      }

      const detail = (await detailResponse.json()) as ModuleDetailResponse
      const response = await fetch(`/api/admin/modules/${encodeURIComponent(moduleId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toPatchPayload(detail, nextStatus)),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.error || "Failed to update module status")
      }

      await Promise.all([loadModules(), loadSyncStatus()])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update module status")
    } finally {
      setActionKey(null)
    }
  }

  const publishedCount = modules.filter((module) => module.status === "published").length
  const draftCount = modules.filter((module) => module.status === "draft").length
  const needsReviewCount = modules.filter(
    (module) => module.source === "youtube" && !module.sourceReviewedAt,
  ).length

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Modules</h1>
          <p className="mt-1 text-neutral-400">
            Manage the live learning catalog, imported YouTube drafts, and publishing workflow.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleSyncNow}
            disabled={syncing}
            className="border-neutral-700 text-neutral-200 hover:bg-neutral-800"
          >
            {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Sync YouTube
          </Button>
          <Button asChild className="bg-emerald-600 text-white hover:bg-emerald-700">
            <Link href="/admin/modules/new" className="gap-2">
              <Plus className="h-4 w-4" />
              Create Module
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-neutral-800 bg-neutral-900">
          <CardContent className="pt-6">
            <p className="text-sm text-neutral-400">Published</p>
            <p className="mt-2 text-3xl font-semibold text-white">{publishedCount}</p>
          </CardContent>
        </Card>
        <Card className="border-neutral-800 bg-neutral-900">
          <CardContent className="pt-6">
            <p className="text-sm text-neutral-400">Draft</p>
            <p className="mt-2 text-3xl font-semibold text-white">{draftCount}</p>
          </CardContent>
        </Card>
        <Card className="border-neutral-800 bg-neutral-900">
          <CardContent className="pt-6">
            <p className="text-sm text-neutral-400">Needs Review</p>
            <p className="mt-2 text-3xl font-semibold text-white">{needsReviewCount}</p>
          </CardContent>
        </Card>
        <Card className="border-neutral-800 bg-neutral-900">
          <CardContent className="pt-6">
            <p className="text-sm text-neutral-400">Last Sync</p>
            <p className="mt-2 text-sm font-medium text-white">
              {formatDate(syncStatus?.state?.lastSuccessAt || null)}
            </p>
          </CardContent>
        </Card>
      </div>

      {syncStatus && (
        <Card className="border-neutral-800 bg-neutral-900">
          <CardHeader>
            <CardTitle className="text-white">YouTube Sync</CardTitle>
            <CardDescription className="text-neutral-400">
              One-channel unlisted import with OAuth-backed sync and admin review.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-neutral-500">Configured</p>
              <p className="mt-2 text-sm text-white">
                {syncStatus.enabled ? (syncStatus.configured ? "Enabled" : "Enabled, missing OAuth config") : "Disabled"}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-neutral-500">Channel</p>
              <p className="mt-2 text-sm text-white">{syncStatus.channelId || "Not set"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-neutral-500">Pending Review</p>
              <p className="mt-2 text-sm text-white">{syncStatus.pendingReviewCount}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-neutral-500">Last Error</p>
              <p className="mt-2 text-sm text-white">{syncStatus.state?.lastError || "None"}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {syncResult && (
        <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-200">
          Sync completed. Imported {syncResult.stats.imported}, updated {syncResult.stats.updated}, marked removed {syncResult.stats.markedRemoved}, notified admins {syncResult.stats.notifiedAdmins}.
        </div>
      )}

      {error && (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <Card className="border-neutral-800 bg-neutral-900">
        <CardHeader>
          <CardTitle className="text-white">Module Catalog</CardTitle>
          <CardDescription className="text-neutral-400">
            Search by title, module ID, or owner. Filter by publishing, audience, and YouTube source state.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="relative xl:col-span-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search title, module ID, owner"
                className="border-neutral-700 bg-neutral-800 pl-9 text-white"
              />
            </div>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-white"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <select
              value={moduleType}
              onChange={(event) => setModuleType(event.target.value)}
              className="rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-white"
            >
              {moduleTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <select
              value={badge}
              onChange={(event) => setBadge(event.target.value)}
              className="rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-white"
            >
              {badgeOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <select
              value={team}
              onChange={(event) => setTeam(event.target.value)}
              className="rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-white"
            >
              <option value="all">All Teams</option>
              {teamOptions.map((teamName) => (
                <option key={teamName} value={teamName}>{teamName}</option>
              ))}
            </select>
            <select
              value={source}
              onChange={(event) => setSource(event.target.value)}
              className="rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-white"
            >
              {sourceOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <select
              value={syncStatusFilter}
              onChange={(event) => setSyncStatusFilter(event.target.value)}
              className="rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-white"
            >
              {syncStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <select
              value={visibility}
              onChange={(event) => setVisibility(event.target.value)}
              className="rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-white"
            >
              {visibilityOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
            </div>
          ) : modules.length === 0 ? (
            <div className="rounded-lg border border-dashed border-neutral-800 bg-neutral-950/40 px-6 py-12 text-center">
              <p className="text-sm text-neutral-300">No modules match the current filters.</p>
              <p className="mt-1 text-xs text-neutral-500">Create or sync modules to build the catalog.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-neutral-800 hover:bg-transparent">
                    <TableHead className="text-neutral-400">Module</TableHead>
                    <TableHead className="text-neutral-400">Source</TableHead>
                    <TableHead className="text-neutral-400">Status</TableHead>
                    <TableHead className="text-neutral-400">Audience</TableHead>
                    <TableHead className="text-neutral-400">Metrics</TableHead>
                    <TableHead className="text-neutral-400">Imported</TableHead>
                    <TableHead className="text-neutral-400">Last Synced</TableHead>
                    <TableHead className="text-right text-neutral-400">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {modules.map((module) => {
                    const statusAction = module.status === "published"
                      ? { label: "Archive", icon: Archive, next: "archived" as ModuleStatus }
                      : module.status === "archived"
                        ? { label: "Unarchive", icon: Upload, next: "draft" as ModuleStatus }
                        : { label: "Publish", icon: Upload, next: "published" as ModuleStatus }

                    return (
                      <TableRow key={module.moduleId} className="border-neutral-800">
                        <TableCell className="align-top">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium text-white">{module.title}</span>
                              <Badge variant="secondary" className={contentTypeBadgeClass(module.moduleType)}>
                                {module.moduleType}
                              </Badge>
                              {module.badges.map((item) => (
                                <Badge key={item} variant="secondary" className={moduleBadgeClass(item)}>
                                  {item}
                                </Badge>
                              ))}
                              {module.source === "youtube" && !module.sourceReviewedAt ? (
                                <Badge variant="secondary" className="bg-amber-900/40 text-amber-300">
                                  New Import
                                </Badge>
                              ) : null}
                            </div>
                            <div className="space-y-1 text-xs text-neutral-400">
                              <p>ID: {module.moduleId}</p>
                              <p>Owner: {module.owner}</p>
                              <p className="line-clamp-2 text-neutral-500">{module.objective}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="align-top">
                          <div className="space-y-2">
                            <Badge variant="secondary" className={sourceBadgeClass(module.source)}>
                              {module.source}
                            </Badge>
                            <Badge variant="secondary" className={visibilityBadgeClass(module.sourceVisibility)}>
                              {module.sourceVisibility}
                            </Badge>
                            <Badge variant="secondary" className={syncBadgeClass(module.sourceStatus)}>
                              {module.sourceStatus}
                            </Badge>
                            {module.sourceVideoId ? (
                              <p className="text-xs text-neutral-500">Video: {module.sourceVideoId}</p>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="align-top">
                          <div className="space-y-2">
                            <Badge variant="secondary" className={statusBadgeClass(module.status)}>
                              {module.status}
                            </Badge>
                            <p className="text-xs text-neutral-500">Quiz: {module.quizMode.replace(/_/g, " ")}</p>
                          </div>
                        </TableCell>
                        <TableCell className="align-top">
                          <div className="flex max-w-xs flex-wrap gap-1.5">
                            {module.teams.length > 0 ? module.teams.map((teamItem) => (
                              <Badge key={teamItem} variant="outline" className="border-neutral-700 text-neutral-300">
                                {teamItem}
                              </Badge>
                            )) : (
                              <span className="text-xs text-neutral-500">No teams</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="align-top">
                          <div className="grid gap-1 text-xs text-neutral-300">
                            <span>Assignments: {module.metrics.assignmentCount}</span>
                            <span>Views: {module.metrics.views}</span>
                            <span>Completions: {module.metrics.completions}</span>
                            <span>Quiz avg: {module.metrics.avgScore}% ({module.metrics.attempts} attempts)</span>
                          </div>
                        </TableCell>
                        <TableCell className="align-top text-xs text-neutral-400">
                          <div className="space-y-1">
                            <p>{formatDate(module.sourceImportedAt || module.createdAt)}</p>
                            {module.sourceReviewedAt ? (
                              <p className="text-neutral-500">Reviewed: {formatDate(module.sourceReviewedAt)}</p>
                            ) : module.source === "youtube" ? (
                              <p className="text-amber-300">Awaiting review</p>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="align-top text-xs text-neutral-400">
                          {formatDate(module.sourceSyncedAt || module.updatedAt)}
                        </TableCell>
                        <TableCell className="align-top">
                          <div className="flex justify-end gap-2">
                            <Button asChild variant="outline" size="sm" className="border-neutral-700 text-neutral-200 hover:bg-neutral-800">
                              <Link href={`/admin/modules/${encodeURIComponent(module.moduleId)}`}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </Link>
                            </Button>
                            <Button asChild variant="outline" size="sm" className="border-neutral-700 text-neutral-200 hover:bg-neutral-800">
                              <Link href={`/admin/modules/new?duplicate=${encodeURIComponent(module.moduleId)}`}>
                                <Copy className="mr-2 h-4 w-4" />
                                Duplicate
                              </Link>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-neutral-700 text-neutral-200 hover:bg-neutral-800"
                              onClick={() => updateStatus(module.moduleId, statusAction.next)}
                              disabled={actionKey === `${module.moduleId}:${statusAction.next}`}
                            >
                              {actionKey === `${module.moduleId}:${statusAction.next}` ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <statusAction.icon className="mr-2 h-4 w-4" />
                              )}
                              {statusAction.label}
                            </Button>
                            {module.source === "youtube" && module.openUrl ? (
                              <Button asChild variant="outline" size="sm" className="border-neutral-700 text-neutral-200 hover:bg-neutral-800">
                                <Link href={module.openUrl} target="_blank" rel="noreferrer">
                                  <Youtube className="mr-2 h-4 w-4" />
                                  Source
                                </Link>
                              </Button>
                            ) : null}
                            <Button asChild variant="outline" size="sm" className="border-neutral-700 text-neutral-200 hover:bg-neutral-800">
                              <Link href="/hub">
                                {module.source === "youtube" ? <ExternalLink className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
                                Hub
                              </Link>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
