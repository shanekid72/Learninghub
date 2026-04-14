import { test, expect, type BrowserContext } from "@playwright/test"

const runFullE2E = process.env.PLAYWRIGHT_FULL_E2E === "1"

function requireEnv(name: string): string {
  const value = process.env[name]
  expect(value, `${name} is required`).toBeTruthy()
  return value!
}

async function seedSupabaseSession(
  context: BrowserContext,
  baseURL: string,
  cookieHeader: string,
) {
  const cookies = cookieHeader
    .split(/;\s*/u)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const separatorIndex = part.indexOf("=")
      return {
        name: part.slice(0, separatorIndex),
        value: part.slice(separatorIndex + 1),
        url: baseURL,
      }
    })

  await context.addCookies(cookies)
}

test.describe("full learner journey (integration)", () => {
  test.skip(
    !runFullE2E,
    "Set PLAYWRIGHT_FULL_E2E=1 and required env vars to run full integration flow.",
  )

  test("protected hub access with a seeded Supabase session", async ({ page, context, baseURL }) => {
    const supabaseCookie = requireEnv("E2E_SUPABASE_COOKIE_HEADER")
    const resolvedBaseUrl = baseURL || "http://127.0.0.1:3000"

    await seedSupabaseSession(context, resolvedBaseUrl, supabaseCookie)

    await page.goto("/hub")
    await expect(page).toHaveURL(/\/hub$/)
  })

  test("module completion and completions query APIs", async ({ request }) => {
    const supabaseCookie = requireEnv("E2E_SUPABASE_COOKIE_HEADER")
    const moduleId = requireEnv("E2E_MODULE_ID")

    const mark = await request.post("/api/lh/mark-complete", {
      headers: { cookie: supabaseCookie },
      data: { moduleId, status: "completed" },
    })
    expect(mark.ok()).toBe(true)

    const completions = await request.get("/api/lh/completions", {
      headers: { cookie: supabaseCookie },
    })
    expect(completions.ok()).toBe(true)
  })

  test("comments, quiz submit, and certificate APIs with seeded Supabase session", async ({ request }) => {
    const supabaseCookie = requireEnv("E2E_SUPABASE_COOKIE_HEADER")
    const moduleId = requireEnv("E2E_MODULE_ID")
    const quizId = requireEnv("E2E_QUIZ_ID")
    const certificateId = requireEnv("E2E_CERTIFICATE_ID")

    const commentCreate = await request.post("/api/comments", {
      headers: { cookie: supabaseCookie },
      data: { moduleId, content: "E2E comment" },
    })
    expect(commentCreate.ok()).toBe(true)

    const createdComment = (await commentCreate.json()) as { id: string }

    const commentUpdate = await request.put(`/api/comments/${createdComment.id}`, {
      headers: { cookie: supabaseCookie },
      data: { content: "Updated E2E comment" },
    })
    expect(commentUpdate.ok()).toBe(true)

    const commentDelete = await request.delete(`/api/comments/${createdComment.id}`, {
      headers: { cookie: supabaseCookie },
    })
    expect(commentDelete.ok()).toBe(true)

    const quizSubmit = await request.post("/api/quiz/submit", {
      headers: { cookie: supabaseCookie },
      data: {
        moduleId,
        quizId,
        answers: {},
      },
    })
    expect(quizSubmit.status()).toBeLessThan(500)

    const certGenerate = await request.post("/api/certificates/generate", {
      headers: { cookie: supabaseCookie },
      data: {
        moduleId,
        moduleTitle: "E2E Module",
      },
    })
    expect(certGenerate.ok()).toBe(true)

    const certDownload = await request.get(`/api/certificates/${certificateId}/download`, {
      headers: { cookie: supabaseCookie },
    })
    expect(certDownload.ok()).toBe(true)
    expect(certDownload.headers()["content-type"]).toContain("image/svg+xml")
  })

  test("learner sessions are redirected away from admin routes", async ({ page, context, baseURL }) => {
    const supabaseCookie = requireEnv("E2E_SUPABASE_COOKIE_HEADER")
    const resolvedBaseUrl = baseURL || "http://127.0.0.1:3000"

    await seedSupabaseSession(context, resolvedBaseUrl, supabaseCookie)

    await page.goto("/admin")
    await expect(page).toHaveURL(/\/hub$/)
  })
})
