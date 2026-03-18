import { NextResponse } from "next/server"
import { z } from "zod"
import { requireAdminProfile } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase/server"
import { generateQuizDraft, hasSufficientQuizSourceNotes } from "@/lib/quiz-generation"
import { fetchYoutubeTranscript, normalizeYoutubeVideoId } from "@/lib/youtube-transcript"

type RouteParams = { params: Promise<{ moduleId: string }> }

const requestSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  objective: z.string().trim().min(1).max(1000).optional(),
  description: z.string().trim().max(5000).nullable().optional(),
  owner: z.string().trim().min(1).max(200).optional(),
  durationMins: z.number().int().min(0).max(600).optional(),
  moduleType: z.string().trim().min(1).max(40).optional(),
  teams: z.array(z.string().trim().min(1).max(120)).max(25).optional(),
  badges: z.array(z.string().trim().min(1).max(40)).max(5).optional(),
  openUrl: z.string().trim().url().nullable().optional(),
  contentEmbedUrl: z.string().trim().url().nullable().optional(),
  source: z.enum(["manual", "youtube"]).optional(),
  sourceVideoId: z.string().trim().min(1).max(64).nullable().optional(),
  generationNotes: z.string().trim().max(12000).nullable().optional(),
})

export async function POST(request: Request, { params }: RouteParams) {
  const admin = await requireAdminProfile()
  if (admin.error) return admin.error

  try {
    const { moduleId } = await params
    const payload = requestSchema.safeParse(await request.json().catch(() => ({})))
    if (!payload.success) {
      return NextResponse.json(
        { error: "Invalid quiz generation payload", details: payload.error.issues },
        { status: 400 },
      )
    }

    const supabase = await createAdminClient()
    const { data: module, error } = await supabase
      .from("learning_modules")
      .select("*")
      .eq("module_id", moduleId)
      .maybeSingle()

    if (error) throw error
    if (!module) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 })
    }

    const merged = {
      moduleId: module.module_id,
      title: payload.data.title ?? module.title,
      objective: payload.data.objective ?? module.objective,
      description: payload.data.description ?? module.description,
      owner: payload.data.owner ?? module.owner,
      durationMins: payload.data.durationMins ?? module.duration_mins,
      moduleType: payload.data.moduleType ?? module.module_type,
      teams: payload.data.teams ?? module.teams,
      badges: payload.data.badges ?? module.badges,
      openUrl: payload.data.openUrl ?? module.open_url,
      contentEmbedUrl: payload.data.contentEmbedUrl ?? module.content_embed_url,
      source: payload.data.source ?? module.source,
      sourceVideoId: payload.data.sourceVideoId ?? module.source_video_id,
      generationNotes: payload.data.generationNotes ?? null,
    }

    let transcript: string | null = null
    let transcriptLanguage: string | null = null
    const warnings: string[] = []

    if (merged.moduleType.toUpperCase() === "VIDEO") {
      const youtubeReference =
        merged.sourceVideoId ||
        normalizeYoutubeVideoId(merged.openUrl || "") ||
        normalizeYoutubeVideoId(merged.contentEmbedUrl || "")

      if (youtubeReference) {
        const transcriptResult = await fetchYoutubeTranscript(youtubeReference)
        transcript = transcriptResult.transcript
        transcriptLanguage = transcriptResult.languageCode
        if (transcriptResult.warning) {
          warnings.push(transcriptResult.warning)
        }
      } else {
        warnings.push("This module does not expose a usable YouTube video reference.")
      }
    }

    if (!transcript && !hasSufficientQuizSourceNotes(merged.generationNotes)) {
      return NextResponse.json(
        {
          error:
            "No usable transcript was found. Paste at least 80 words of source notes or transcript text into Generation Notes / Transcript Override, then try again.",
        },
        { status: 400 },
      )
    }

    const result = await generateQuizDraft({
      moduleId: merged.moduleId,
      title: merged.title,
      objective: merged.objective,
      description: merged.description,
      owner: merged.owner,
      durationMins: merged.durationMins,
      moduleType: merged.moduleType,
      teams: merged.teams,
      badges: merged.badges,
      transcript,
      generationNotes: merged.generationNotes,
      sourceSummary: transcript
        ? `YouTube captions transcript${transcriptLanguage ? ` (${transcriptLanguage})` : ""} plus module metadata`
        : "admin-provided source notes plus module metadata",
    })

    return NextResponse.json({
      quiz: result.quiz,
      contextSource: result.contextSource,
      transcriptUsed: Boolean(transcript),
      transcriptLanguage,
      warnings: [...warnings, ...result.warnings],
      model: result.model,
    })
  } catch (error) {
    console.error("Error generating quiz draft:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate quiz draft" },
      { status: 500 },
    )
  }
}
