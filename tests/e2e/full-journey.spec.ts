import { test, expect } from "@playwright/test"

const runFullE2E = process.env.PLAYWRIGHT_FULL_E2E === "1"

test.describe("full learner journey (integration)", () => {
  test.skip(
    !runFullE2E,
    "Set PLAYWRIGHT_FULL_E2E=1 and required env vars to run full integration flow.",
  )

  test("login and protected hub access", async ({ page }) => {
    const email = process.env.E2E_LOGIN_EMAIL
    expect(email, "E2E_LOGIN_EMAIL is required").toBeTruthy()

    await page.goto("/")
    await page.getByPlaceholder("Email address").fill(email!)
    await page.getByRole("button", { name: /Get Started/i }).click()
    await expect(page).toHaveURL(/\/hub$/)
  })

  test("module completion and completions query APIs", async ({ request }) => {
    const email = process.env.E2E_LOGIN_EMAIL
    const moduleId = process.env.E2E_MODULE_ID
    expect(email, "E2E_LOGIN_EMAIL is required").toBeTruthy()
    expect(moduleId, "E2E_MODULE_ID is required").toBeTruthy()

    const login = await request.post("/api/auth/login", {
      data: { email },
    })
    expect(login.ok()).toBe(true)

    const mark = await request.post("/api/lh/mark-complete", {
      data: { moduleId, status: "completed" },
    })
    expect(mark.ok()).toBe(true)

    const completions = await request.get("/api/lh/completions")
    expect(completions.ok()).toBe(true)
  })

  test("comments, quiz submit, and certificate APIs with seeded Supabase session", async ({ request }) => {
    const supabaseCookie = process.env.E2E_SUPABASE_COOKIE_HEADER
    const moduleId = process.env.E2E_MODULE_ID
    const quizId = process.env.E2E_QUIZ_ID
    const certificateId = process.env.E2E_CERTIFICATE_ID

    expect(supabaseCookie, "E2E_SUPABASE_COOKIE_HEADER is required").toBeTruthy()
    expect(moduleId, "E2E_MODULE_ID is required").toBeTruthy()
    expect(quizId, "E2E_QUIZ_ID is required").toBeTruthy()
    expect(certificateId, "E2E_CERTIFICATE_ID is required").toBeTruthy()

    const commentCreate = await request.post("/api/comments", {
      headers: { cookie: supabaseCookie! },
      data: { moduleId, content: "E2E comment" },
    })
    expect(commentCreate.ok()).toBe(true)

    const createdComment = (await commentCreate.json()) as { id: string }

    const commentUpdate = await request.put(`/api/comments/${createdComment.id}`, {
      headers: { cookie: supabaseCookie! },
      data: { content: "Updated E2E comment" },
    })
    expect(commentUpdate.ok()).toBe(true)

    const commentDelete = await request.delete(`/api/comments/${createdComment.id}`, {
      headers: { cookie: supabaseCookie! },
    })
    expect(commentDelete.ok()).toBe(true)

    const quizSubmit = await request.post("/api/quiz/submit", {
      headers: { cookie: supabaseCookie! },
      data: {
        moduleId,
        quizId,
        answers: {},
      },
    })
    expect(quizSubmit.status()).toBeLessThan(500)

    const certGenerate = await request.post("/api/certificates/generate", {
      headers: { cookie: supabaseCookie! },
      data: {
        moduleId,
        moduleTitle: "E2E Module",
      },
    })
    expect(certGenerate.ok()).toBe(true)

    const certDownload = await request.get(`/api/certificates/${certificateId}/download`, {
      headers: { cookie: supabaseCookie! },
    })
    expect(certDownload.ok()).toBe(true)
    expect(certDownload.headers()["content-type"]).toContain("image/svg+xml")
  })

  test("admin authorization guard", async ({ page }) => {
    await page.goto("/admin")
    await expect(page).not.toHaveURL(/\/admin$/)
  })
})
