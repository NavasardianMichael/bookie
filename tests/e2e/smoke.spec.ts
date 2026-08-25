import { expect, test } from '@playwright/test'

/**
 * Scaffold only — proves the harness runs and the app boots. Real flows worth writing
 * next are listed in docs/BACKLOG.md: the auth OTP flow, booking slot selection, and
 * the provider profile edit.
 *
 * Requires the full stack. See playwright.config.ts.
 */

test('home page renders with a heading', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
})

test('providers list is reachable from the nav', async ({ page }) => {
  await page.goto('/providers')
  await expect(page).toHaveURL(/\/providers$/)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
})

// The refactor's single highest-leverage fix was adding the `viewport` export; without
// it mobile browsers rendered at ~980px and scaled down. This is the regression guard.
test('the page never scrolls horizontally', async ({ page }) => {
  await page.goto('/providers')

  const overflows = await page.evaluate(() =>
    [...document.querySelectorAll('*')]
      .filter((el) => el.scrollWidth > document.documentElement.clientWidth + 1)
      .map((el) => `${el.tagName.toLowerCase()}.${el.className}`)
      .slice(0, 5)
  )

  expect(overflows).toEqual([])
})

test('the skip link moves focus to main content', async ({ page }) => {
  await page.goto('/')
  await page.keyboard.press('Tab')

  const skipLink = page.getByRole('link', { name: /skip/i })
  await expect(skipLink).toBeFocused()
})
