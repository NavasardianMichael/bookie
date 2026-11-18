/** ISO 8601 duration — the form schema.org's `timeRequired` and `<time datetime>` expect. */
export const toIsoDuration = (minutes: number): string => `PT${minutes}M`

/**
 * Human wording for the same value in `locale` — "1 hr 30 min", "1 ч 30 мин", "1時間30分" — from
 * the runtime's CLDR data (`Intl.NumberFormat` units, joined by `Intl.ListFormat`), so no
 * catalogue key has to spell a unit in sixteen languages.
 */
export const formatDuration = (minutes: number, locale: string): string => {
  const unit = (value: number, name: 'hour' | 'minute'): string =>
    new Intl.NumberFormat(locale, { style: 'unit', unit: name, unitDisplay: 'short' }).format(value)
  if (minutes < 60) return unit(minutes, 'minute')

  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (!rest) return unit(hours, 'hour')
  return new Intl.ListFormat(locale, { type: 'unit', style: 'narrow' }).format([unit(hours, 'hour'), unit(rest, 'minute')])
}
