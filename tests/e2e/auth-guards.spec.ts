import { test, expect } from "@playwright/test"

test("unauthenticated users are redirected away from /hub and /admin", async ({ page }) => {
  await page.goto("/hub")
  await expect(page).toHaveURL(/\/$/)

  await page.goto("/admin")
  await expect(page).toHaveURL(/\/$/)
})

test("root login form blocks malformed email before API call", async ({ page }) => {
  await page.goto("/")
  const heroForm = page.locator("#get-started")
  await heroForm.getByPlaceholder("Email address").fill("not-an-email")
  await heroForm.getByRole("button", { name: /Get Started/i }).click()
  await expect(page.getByText("Please enter a valid email address.")).toBeVisible()
})

test("unauthenticated lh API endpoints return 401", async ({ request }) => {
  const modules = await request.get("/api/lh/modules")
  expect(modules.status()).toBe(401)

  const completions = await request.get("/api/lh/completions")
  expect(completions.status()).toBe(401)

  const markComplete = await request.post("/api/lh/mark-complete", {
    data: { moduleId: "module-1", status: "completed" },
  })
  expect(markComplete.status()).toBe(401)
})
