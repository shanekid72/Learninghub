import { describe, expect, it } from "vitest"
import { __internal, normalizeYoutubeVideoId } from "@/lib/youtube-transcript"

describe("youtube transcript helpers", () => {
  it("normalizes common YouTube video URL formats", () => {
    expect(normalizeYoutubeVideoId("3youdElfcCY")).toBe("3youdElfcCY")
    expect(normalizeYoutubeVideoId("https://www.youtube.com/watch?v=3youdElfcCY")).toBe("3youdElfcCY")
    expect(normalizeYoutubeVideoId("https://youtu.be/3youdElfcCY")).toBe("3youdElfcCY")
    expect(normalizeYoutubeVideoId("https://www.youtube.com/embed/3youdElfcCY")).toBe("3youdElfcCY")
  })

  it("extracts caption tracks from a YouTube watch page response", () => {
    const html = `
      <script>
        var ytInitialPlayerResponse = {"captions":{"playerCaptionsTracklistRenderer":{"captionTracks":[{"baseUrl":"https://example.com/captions?lang=en","languageCode":"en"}]}}};
      </script>
    `

    expect(__internal.extractCaptionTracks(html)).toEqual([
      { baseUrl: "https://example.com/captions?lang=en", languageCode: "en" },
    ])
  })

  it("parses json3, vtt, and xml transcript bodies into plain text", () => {
    const json3 = JSON.stringify({
      events: [
        { segs: [{ utf8: "Hello " }, { utf8: "team" }] },
        { segs: [{ utf8: "Welcome back" }] },
      ],
    })
    const vtt = `WEBVTT\n\n00:00:00.000 --> 00:00:02.000\nHello team\n\n00:00:02.100 --> 00:00:04.000\nWelcome back`
    const xml = `<transcript><text>Hello team</text><text>Welcome back</text></transcript>`

    expect(__internal.parseJson3Transcript(json3)).toBe("Hello team Welcome back")
    expect(__internal.parseVttTranscript(vtt)).toBe("Hello team Welcome back")
    expect(__internal.parseXmlTranscript(xml)).toBe("Hello team Welcome back")
  })
})
