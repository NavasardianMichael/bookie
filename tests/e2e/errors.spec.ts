import { APIRequestContext, expect, Route, test } from '@playwright/test'

/**
 * Error handling, end to end: what a visitor sees when a request fails, and that the
 * Retry offered actually recovers. Failures are injected with `page.route`, so no test
 * depends on the API misbehaving — and the booking test fulfils its `POST` itself, so it
 * writes nothing to the database.
 *
 * Requires the full stack. See playwright.config.ts. The copy asserted is `en.json`'s.
 */

const API_URL = process.env.E2E_API_URL ?? 'http://localhost:9004'

const envelopeError = (status: number, message: string) => ({
  status,
  contentType: 'application/json',
  body: JSON.stringify({ value: null, error: { code: status, message } }),
})

const isApi = (url: URL, pathname: RegExp): boolean => url.origin === new URL(API_URL).origin && pathname.test(url.pathname)

/** A listed provider with at least one active service — something a guest can book. */
const findBookableProvider = async (request: APIRequestContext): Promise<string> => {
  const list = await (await request.get(`${API_URL}/providers?perPage=20`)).json()
  for (const item of list.value.items as { id: string }[]) {
    const detail = await (await request.get(`${API_URL}/providers/${item.id}`)).json()
    const services = Object.values(detail.value?.services?.byId ?? {}) as { active?: boolean }[]
    if (services.some((service) => service.active !== false)) return item.id
  }
  throw new Error('No bookable provider in the seed')
}

test('an unknown category is the 404 page, not an error page', async ({ page }) => {
  await page.goto('/en/categories/no-such-category')
  await expect(page.getByText('Page not found')).toBeVisible()
  await expect(page.getByText('Something went wrong')).toHaveCount(0)
})

test('a failed busy-times read warns above the slots, and Retry recovers', async ({ page, request }) => {
  const providerId = await findBookableProvider(request)
  let failBusy = true
  await page.route(
    (url) => isApi(url, /^\/providers\/[^/]+\/busy$/),
    (route: Route) => (failBusy ? route.fulfill(envelopeError(503, 'Service unavailable')) : route.continue())
  )

  await page.goto(`/en/providers/${providerId}`)
  const warning = page.getByText('We could not check which times are already booked')
  await expect(warning).toBeVisible()

  failBusy = false
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(warning).toBeHidden()
})

// A 400 cannot be fixed by asking again, so the same warning offers no Retry.
test('a busy-times 400 warns without offering a Retry that cannot work', async ({ page, request }) => {
  const providerId = await findBookableProvider(request)
  await page.route(
    (url) => isApi(url, /^\/providers\/[^/]+\/busy$/),
    (route: Route) => route.fulfill(envelopeError(400, 'from and to must be ISO timestamps'))
  )

  await page.goto(`/en/providers/${providerId}`)
  await expect(page.getByText('We could not check which times are already booked')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Try again' })).toHaveCount(0)
})

/**
 * The reported bug: after a 201 the panel re-reads the busy times, the slot just booked
 * leaves the grid, and the sheet used to swap its success view for a spinner that never
 * stopped. The busy route below reports that slot as taken once it is booked — the exact
 * condition — and the confirmation must survive it.
 */
test('a successful booking keeps its confirmation after the grid refreshes', async ({ page, request }) => {
  const providerId = await findBookableProvider(request)
  let booked: { startAt: string; endAt: string } | null = null

  await page.route(
    (url) => isApi(url, /^\/appointments\/?$/),
    async (route: Route) => {
      if (route.request().method() !== 'POST') return route.continue()
      const body = route.request().postDataJSON() as { startAt: string; serviceId: string }
      const start = new Date(body.startAt)
      booked = { startAt: start.toISOString(), endAt: new Date(start.getTime() + 30 * 60_000).toISOString() }
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          value: {
            id: 'e2e-appointment',
            providerId,
            serviceId: body.serviceId,
            time: { startDate: booked.startAt, endDate: booked.endAt, duration: 30 },
            status: 'scheduled',
            paymentMethods: [],
            manageToken: 'e2e-manage-token',
            emailSent: false,
            requiresApproval: false,
          },
          error: null,
        }),
      })
    }
  )
  await page.route(
    (url) => isApi(url, /^\/providers\/[^/]+\/busy$/),
    (route: Route) =>
      booked
        ? route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ value: [booked], error: null }) })
        : route.continue()
  )

  await page.goto(`/en/providers/${providerId}`)
  await page.locator('input[name="booking-service"]').first().check({ force: true })
  await page.locator('button[data-start]:not([disabled])').first().click()
  await page.getByRole('button', { name: 'Book now' }).click()

  await page.getByRole('textbox', { name: 'First name' }).fill('E2E')
  await page.getByRole('textbox', { name: 'Last name' }).fill('Tester')
  await page.getByRole('textbox', { name: 'Phone number' }).fill('+37400000000')

  const refreshed = page.waitForResponse((response) => /\/busy\?/.test(response.url()) && booked !== null)
  await page.getByRole('button', { name: /Confirm booking|Send booking request/ }).click()

  const confirmation = page.getByText(/Booking confirmed|Booking requested/)
  await expect(confirmation).toBeVisible()
  await refreshed
  await expect(confirmation).toBeVisible()
  await expect(page.locator('.ant-spin-spinning')).toHaveCount(0)
})

test('a settings panel whose load fails shows the error, not a form on defaults', async ({ page }) => {
  const login = await page.request.post(`${API_URL}/identity/login`, {
    data: { email: 'alex.consumer@bookie.am', password: 'bookie-dev-1234' },
  })
  expect(login.ok()).toBe(true)

  let failProfile = true
  await page.route(
    (url) => isApi(url, /^\/consumer-profile\/?$/),
    (route: Route) =>
      failProfile && route.request().method() === 'GET'
        ? route.fulfill(envelopeError(503, 'Service unavailable'))
        : route.continue()
  )

  await page.goto('/en/consumers/profile/notifications')
  await expect(page.getByText('We could not load this part of your account')).toBeVisible()
  await expect(page.getByRole('switch')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Save Changes' })).toHaveCount(0)

  failProfile = false
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(page.getByRole('switch').first()).toBeVisible()
})
