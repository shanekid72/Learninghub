// lib/watch-history.ts
export interface WatchEntry {
  contentId: number // Unique ID for the movie/show
  episodeId?: number // Unique ID for the episode (if TV show)
  progress: number // Current playback time in seconds
  duration: number // Total duration of the content in seconds
  timestamp: number // Last updated timestamp
}

const USER_ID = "user-123" // Simulating a logged-in user ID

const getLocalStorageKey = (userId: string) => `netflix_watch_history_${userId}`

export const getWatchHistory = (userId: string = USER_ID): WatchEntry[] => {
  if (typeof window === "undefined") return [] // Ensure this runs only in browser
  try {
    const historyJson = localStorage.getItem(getLocalStorageKey(userId))
    return historyJson ? JSON.parse(historyJson) : []
  } catch (error) {
    console.error("Failed to load watch history from localStorage:", error)
    return []
  }
}

export const saveWatchProgress = (
  contentId: number,
  progress: number,
  duration: number,
  episodeId?: number,
  userId: string = USER_ID,
) => {
  if (typeof window === "undefined") return // Ensure this runs only in browser
  try {
    const history = getWatchHistory(userId)
    let existingEntryIndex = -1

    if (episodeId !== undefined) {
      // For TV shows, find by contentId and episodeId
      existingEntryIndex = history.findIndex((entry) => entry.contentId === contentId && entry.episodeId === episodeId)
    } else {
      // For movies, find by contentId
      existingEntryIndex = history.findIndex((entry) => entry.contentId === contentId && entry.episodeId === undefined)
    }

    const newEntry: WatchEntry = {
      contentId,
      episodeId,
      progress,
      duration,
      timestamp: Date.now(),
    }

    if (existingEntryIndex !== -1) {
      history[existingEntryIndex] = newEntry
    } else {
      history.push(newEntry)
    }

    localStorage.setItem(getLocalStorageKey(userId), JSON.stringify(history))
  } catch (error) {
    console.error("Failed to save watch history to localStorage:", error)
  }
}

export const deleteWatchEntry = (contentId: number, episodeId?: number, userId: string = USER_ID) => {
  if (typeof window === "undefined") return // Ensure this runs only in browser
  try {
    let history = getWatchHistory(userId)
    if (episodeId !== undefined) {
      history = history.filter((entry) => !(entry.contentId === contentId && entry.episodeId === episodeId))
    } else {
      history = history.filter((entry) => !(entry.contentId === contentId && entry.episodeId === undefined))
    }
    localStorage.setItem(getLocalStorageKey(userId), JSON.stringify(history))
  } catch (error) {
    error("Failed to delete watch entry from localStorage:", error)
  }
}

export const clearAllWatchHistory = (userId: string = USER_ID) => {
  if (typeof window === "undefined") return // Ensure this runs only in browser
  try {
    localStorage.removeItem(getLocalStorageKey(userId))
  } catch (error) {
    console.error("Failed to clear all watch history from localStorage:", error)
  }
}
