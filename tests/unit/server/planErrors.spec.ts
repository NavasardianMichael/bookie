import { describe, expect, it } from 'vitest'
// Aliased web constants beside relative server modules: the subject of every test here is
// an agreement between the two packages, which share no type (tests/CLAUDE.md).
import { PLAN_ERROR_CODES, PLAN_ORDER as WEB_PLAN_ORDER, PLANS } from '@constants/plans'
import { ROUTES } from '@constants/routes'
import { PLAN_ERROR } from '../../../server/src/lib/plan-errors'
import { buildPlanUrl, PROVIDER_PLAN_PATH } from '../../../server/src/lib/return-path'
import { PLAN_ORDER } from '../../../server/src/services/plans'

/**
 * Three agreements the plan surface rests on. A rename or a reorder on one side alone
 * typechecks and ships: a limit refusal falls back to a generic 403, the pricing table
 * lists plans the API does not know, or an allowance email links to a 404.
 */
describe('the plan error codes', () => {
  it('are numbered the same on both sides of the wire', () => {
    expect(PLAN_ERROR_CODES).toEqual(PLAN_ERROR)
  })
})

describe('the plan list', () => {
  it('names the same plans, in the same order, on both sides', () => {
    expect([...WEB_PLAN_ORDER]).toEqual([...PLAN_ORDER])
    expect(Object.values(PLANS).sort()).toEqual([...PLAN_ORDER].sort())
  })
})

describe('the Plan tab link', () => {
  it('points at the route that actually exists', () => {
    expect(PROVIDER_PLAN_PATH).toBe(ROUTES.providerProfilePlan)
  })

  it('builds an absolute URL with exactly one locale segment', () => {
    expect(buildPlanUrl('https://bookie.example/', 'hy')).toBe('https://bookie.example/hy/providers/profile/plan')
  })
})
