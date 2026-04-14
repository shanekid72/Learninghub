import { test, expect } from "@playwright/test"

test("unauthenticated users are redirected away from /hub and /admin", async ({ page }) => {
  await page.goto("/hub")
  await expect(page).toHaveURL(/\/$/)

  await page.goto("/admin")
  await expect(page).toHaveURL(/\/$/)
})

test("root page shows the Google sign-in CTA and callback errors", async ({ page }) => {
  await page.goto("/?error=auth_domain_not_allowed")

  await expect(page.getByRole("button", { name: /Continue with Google/i }).first()).toBeVisible()
  await expect(
    page.getByText("Your Google account is not allowed to access Learning Hub."),
  ).toBeVisible()
})
