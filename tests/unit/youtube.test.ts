import { describe, expect, it } from "vitest"
import { normalizeYoutubeVideo, parseYoutubeDurationToMinutes } from "@/lib/youtube"

describe("youtube helpers", () => {
  it("rounds ISO 8601 durations up to the next minute when seconds are present", () => {
    expect(parseYoutubeDurationToMinutes("PT14M")).toBe(14)
    expect(parseYoutubeDurationToMinutes("PT14M1S")).toBe(15)
    expect(parseYoutubeDurationToMinutes("PT1H2M5S")).toBe(63)
    expect(parseYoutubeDurationToMinutes("PT45S")).toBe(1)
  })

  it("normalizes YouTube API video payloads into module-ready metadata", () => {
    const normalized = normalizeYoutubeVideo({
      id: "abc123",
      snippet: {
        title: "AML Walkthrough",
        description: "Channel upload",
        channelId: "channel-1",
        channelTitle: "Learning Hub Media",
        publishedAt: "2026-03-17T10:00:00.000Z",
        thumbnails: {
          high: { url: "https://img.youtube.com/vi/abc123/hqdefault.jpg" },
        },
      },
      contentDetails: {
        duration: "PT12M4S",
      },
      status: {
        privacyStatus: "unlisted",
        embeddable: true,
        uploadStatus: "processed",
      },
    })

    expect(normalized).toMatchObject({
      videoId: "abc123",
      title: "AML Walkthrough",
      channelId: "channel-1",
      channelTitle: "Learning Hub Media",
      durationMins: 13,
      privacyStatus: "unlisted",
      embeddable: true,
      embedUrl: "https://www.youtube.com/embed/abc123",
      watchUrl: "https://www.youtube.com/watch?v=abc123",
      thumbnailUrl: "https://img.youtube.com/vi/abc123/hqdefault.jpg",
    })
  })
})
