import { describe, expect, it } from "vitest"
import { sanitizeCommentContent, sanitizeInput } from "@/lib/sanitize"

describe("sanitize", () => {
  it("strips script tags and HTML tags", () => {
    const input = '<script>alert("xss")</script><b>Hello</b> world'
    expect(sanitizeInput(input)).toBe("Hello world")
  })

  it("removes dangerous protocol fragments", () => {
    const input = 'javascript:alert(1) data:text/html;base64,abc vbscript:msgbox("x")'
    const output = sanitizeInput(input)
    expect(output).not.toContain("javascript:")
    expect(output).not.toContain("data:")
    expect(output).not.toContain("vbscript:")
  })

  it("removes control characters and caps comment length", () => {
    const input = `hello\u0000\u0007${"a".repeat(2500)}`
    const sanitized = sanitizeCommentContent(input)

    expect(sanitized.includes("\u0000")).toBe(false)
    expect(sanitized.includes("\u0007")).toBe(false)
    expect(sanitized.length).toBe(2000)
  })
})
