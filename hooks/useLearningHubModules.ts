"use client"

import { useState, useEffect } from "react"

/** Shape returned from the Google Apps Script API */
export interface LHModule {
    id: number | string
    title: string
    objective: string
    type: string
    duration_mins: number
    thumbnail_url: string
    content_embed_url: string
    open_url: string
    badges: string
    teams: string
    sort_order: number
}

export function useLearningHubModules() {
    const [modules, setModules] = useState<LHModule[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let cancelled = false

        async function load() {
            try {
                const res = await fetch("/api/lh/modules")
                const json = await res.json()

                if (!cancelled && json?.modules) {
                    setModules(json.modules)
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

    return { modules, loading }
}
