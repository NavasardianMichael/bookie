import { describe, expect, it } from 'vitest'
import { ROUTES } from '@constants/routes'
import { counterpartPath, workspaceOf } from '@helpers/workspace'

/**
 * The workspace switch's only logic. It decides where a person lands when they move
 * between the two halves of their own account, so the failure mode is a control that
 * drops them somewhere unrelated — or on a URL that has never existed.
 */
describe('workspaceOf', () => {
  it('recognises the provider tree, including its nested tabs', () => {
    expect(workspaceOf(ROUTES.providerProfile)).toBe('provider')
    expect(workspaceOf(ROUTES.providerProfileApprovals)).toBe('provider')
    expect(workspaceOf(ROUTES.providerProfileAnalytics)).toBe('provider')
  })

  /**
   * `/providers/profile-services` is a provider settings tab that lives *outside*
   * `/providers/profile`. A bare prefix test on the profile route misses it, and the
   * switch would then not render on the Services tab at all.
   */
  it('recognises the services tab, which sits outside the profile prefix', () => {
    expect(workspaceOf(ROUTES.providerServices)).toBe('provider')
  })

  it('recognises the consumer tree', () => {
    expect(workspaceOf(ROUTES.consumerProfile)).toBe('consumer')
    expect(workspaceOf(ROUTES.consumerProfileNotifications)).toBe('consumer')
  })

  // A prefix test must not match a sibling that merely starts with the same characters.
  it('does not claim a public route', () => {
    expect(workspaceOf(ROUTES.providers)).toBeNull()
    expect(workspaceOf(ROUTES.home)).toBeNull()
    expect(workspaceOf(ROUTES.providerProfileCreation)).toBeNull()
  })

  /**
   * Bookings and favourites are one page for the whole account, outside both settings
   * trees. Claiming either would render the workspace switch above a page that has its
   * own switch.
   */
  it('does not claim the account pages in the header', () => {
    expect(workspaceOf(ROUTES.bookings)).toBeNull()
    expect(workspaceOf(ROUTES.favorites)).toBeNull()
  })
})

describe('counterpartPath', () => {
  it('holds the tab when both sides have one', () => {
    expect(counterpartPath(ROUTES.providerProfile, 'consumer')).toBe(ROUTES.consumerProfile)
    expect(counterpartPath(ROUTES.providerProfileNotifications, 'consumer')).toBe(
      ROUTES.consumerProfileNotifications
    )
    expect(counterpartPath(ROUTES.consumerProfileNotifications, 'provider')).toBe(
      ROUTES.providerProfileNotifications
    )
  })

  /**
   * The booking tabs used to be paired across the trees. They are 307 stubs to `/bookings`
   * now, and a switch that pointed at one would bounce the visitor out of settings
   * altogether, leaving the back button on a URL that redirects again.
   */
  it('never points at a retired booking tab', () => {
    const retired = [
      ROUTES.providerProfileBookings,
      ROUTES.providerProfileConsumerBookings,
      ROUTES.consumerProfileAppointments,
    ]
    const sources = [...retired, ROUTES.providerProfile, ROUTES.consumerProfile, ROUTES.providerProfileNotifications]

    for (const source of sources) {
      expect(retired).not.toContain(counterpartPath(source, 'consumer'))
      expect(retired).not.toContain(counterpartPath(source, 'provider'))
    }
  })

  // The requested fallback: a tab with no meaning on the other side lands on its home.
  it('falls back to the target home for a tab the other side does not have', () => {
    for (const route of [
      ROUTES.providerProfileApprovals,
      ROUTES.providerProfileAnalytics,
      ROUTES.providerProfileAvailability,
      ROUTES.providerProfileSeo,
    ]) {
      expect(counterpartPath(route, 'consumer')).toBe(ROUTES.consumerProfile)
    }
  })

  /**
   * Consumer payment preferences were merged into the Profile tab, leaving
   * `/consumers/profile/payments` a redirect stub. Pointing the switch at the stub would
   * work once and leave the back button on a URL that bounces again.
   */
  it('routes provider payments to the consumer home, not the redirect stub', () => {
    expect(counterpartPath(ROUTES.providerProfilePayments, 'consumer')).toBe(ROUTES.consumerProfile)
  })

  // Never invent a URL: an unmapped or unknown path resolves to a page that exists.
  it('answers with a real page for a path it does not know', () => {
    expect(counterpartPath('/providers/profile/something-new', 'consumer')).toBe(ROUTES.consumerProfile)
    expect(counterpartPath('/nonsense', 'provider')).toBe(ROUTES.providerProfile)
  })

  /**
   * Every destination must be a route the app actually serves. The table is written by
   * hand, so a typo in it is otherwise invisible until someone clicks the control.
   */
  it('only ever points at a declared route', () => {
    const declared = new Set(Object.values(ROUTES))
    const sources = [
      ROUTES.providerProfile,
      ROUTES.providerProfileNotifications,
      ROUTES.providerProfilePayments,
      ROUTES.providerServices,
      ROUTES.consumerProfile,
      ROUTES.consumerProfileNotifications,
    ]

    for (const source of sources) {
      expect(declared.has(counterpartPath(source, 'consumer'))).toBe(true)
      expect(declared.has(counterpartPath(source, 'provider'))).toBe(true)
    }
  })
})
