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
    [1, '1 min'],
    [45, '45 min'],
    [59, '59 min'],
    [60, '1 hr'],
    [61, '1 hr 1 min'],
    [90, '1 hr 30 min'],
    [120, '2 hr'],
    [125, '2 hr 5 min'],
  ])('renders %i minutes as "%s" in English', (minutes, expected) => {
    expect(formatDuration(minutes, 'en')).toBe(expected)
  })

  // It used to print English everywhere. Each locale's units come from CLDR, not from us, so
  // these pin only what must hold: the number is there and the English unit is not.
  it.each(['ru', 'de', 'ja', 'hy', 'ar', 'zh-CN'])('words the units in %s', (locale) => {
    const text = formatDuration(90, locale)
    expect(text).toMatch(/1/)
    expect(text).toMatch(/30/)
    expect(text).not.toMatch(/hr|min\b/)
  })

  it('reads Russian as Russian', () => {
    expect(formatDuration(45, 'ru')).toBe('45 мин')
    expect(formatDuration(90, 'ru')).toBe('1 ч 30 мин')
  })

  // The visible label and the `datetime` attribute are generated from the same number
  // by these two functions; if they ever disagree the markup lies about the content.
  it('agrees with toIsoDuration on the underlying value', () => {
    expect(toIsoDuration(90)).toBe('PT90M')
    expect(formatDuration(90, 'en')).toBe('1 hr 30 min')
  })
})
