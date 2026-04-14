type ClientAnalyticsPayload =
  | {
      type: "module_view"
      moduleId: string
    }
  | {
      type: "quiz_start"
      moduleId: string
      quizId: string
    }
  | {
      type: "search"
      query: string
      resultsCount: number
    }

async function trackEvent(payload: ClientAnalyticsPayload) {
  try {
    const response = await fetch("/api/analytics/events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      keepalive: true,
    })

    if (!response.ok) {
      console.error("Failed to track event:", await response.text())
    }
  } catch (error) {
    console.error("Analytics tracking error:", error)
  }
}

export async function trackModuleView(moduleId: string) {
  return trackEvent({ type: "module_view", moduleId })
}

export async function trackQuizStart(moduleId: string, quizId: string) {
  return trackEvent({
    type: "quiz_start",
    moduleId,
    quizId,
  })
}

export async function trackSearch(query: string, resultsCount: number) {
  return trackEvent({
    type: "search",
    query,
    resultsCount,
  })
}
