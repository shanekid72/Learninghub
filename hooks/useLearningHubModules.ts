"use client"

import { useState, useEffect } from "react"

/** Shape returned from the LearningHub module API */
export interface LHModule {
    id: number | string
    title: string
    description?: string | null
    objective: string
    type: string
    duration_mins: number
    thumbnail_url: string
    content_embed_url: string
    open_url: string
    badges: string
    teams: string
    sort_order: number
    quiz_mode?: "none" | "internal" | "external_embed" | "external_link" | null
    quiz_embed_url?: string | null
    quiz_url?: string | null
    assigned?: boolean
    due_date?: string | null
    last_updated?: string | null
    owner?: string | null
}

export function useLearningHubModules() {
    const [modules, setModules] = useState<LHModule[]>([])
    const [teams, setTeams] = useState<string[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let cancelled = false

        async function load() {
            try {
                const res = await fetch("/api/lh/modules")
                const json = await res.json()

                if (!cancelled && json?.modules) {
                    setModules(json.modules)
                    setTeams(Array.isArray(json.teams) ? json.teams : [])
                }
            } catch (err) {
                console.error("Failed to load modules:", err)
            } finally {
                if (!cancelled) setLoading(false)
            }
        }

        load()
        return () => { cancelled = true }
    }, [])

    return { modules, teams, loading }
}
