/**
 * Shared size and tone lookups for the bare text primitives.
 *
 * Literal class strings in a lookup, never template interpolation: Tailwind v4
 * scans source text and will not generate a dynamically assembled class.
 */

export type TextSize = 'body' | 'body-sm' | 'caption' | 'overline'
export type TextTone = 'default' | 'muted' | 'brand' | 'danger'

export const TEXT_SIZES: Record<TextSize, string> = {
  body: 'text-body',
  'body-sm': 'text-body-sm',
  caption: 'text-caption',
  overline: 'text-overline uppercase',
}

export const TEXT_TONES: Record<TextTone, string> = {
  default: 'text-brand-text',
  muted: 'text-brand-muted',
  brand: 'text-brand',
  danger: 'text-brand-danger',
}
