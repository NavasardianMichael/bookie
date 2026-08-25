import { describe, expect, it } from 'vitest'
import { formatDuration, toIsoDuration } from '@helpers/duration'

describe('toIsoDuration', () => {
  it.each([
    [0, 'PT0M'],
    [45, 'PT45M'],
    [90, 'PT90M'],
  ])('renders %i minutes as %s', (minutes, expected) => {
    expect(toIsoDuration(minutes)).toBe(expected)
  })
})

describe('formatDuration', () => {
  it.each([
    [0, '0 min'],
    [45, '45 min'],
    [59, '59 min'],
    [60, '1 h'],
    [90, '1 h 30 min'],
    [120, '2 h'],
    [125, '2 h 5 min'],
  ])('renders %i minutes as "%s"', (minutes, expected) => {
    expect(formatDuration(minutes)).toBe(expected)
  })

  // The visible label and the `datetime` attribute are generated from the same number
  // by these two functions; if they ever disagree the markup lies about the content.
  it('agrees with toIsoDuration on the underlying value', () => {
    expect(toIsoDuration(90)).toBe('PT90M')
    expect(formatDuration(90)).toBe('1 h 30 min')
  })
})
