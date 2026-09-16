import { FC } from 'react'
import { cn } from '@helpers/cn'
import { StarIcon } from '../icons'

export type RatingStarsSize = 'sm' | 'md' | 'lg'

export type RatingStarsProps = {
  /** 0–5. Fractional values render a partially filled star. */
  value: number
  size?: RatingStarsSize
  /**
   * What a screen reader announces. Required rather than derived, because the sentence
   * has to be translated — this component takes no translator, so the caller composes it.
   * Pass `undefined` only when an adjacent element already says it, and the row is then
   * hidden from assistive technology entirely.
   */
  label?: string
  className?: string
}

const SIZE: Record<RatingStarsSize, string> = {
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
}

const STAR_COUNT = 5

/**
 * A read-only star rating, with **no antd**.
 *
 * That is the whole reason it exists. antd's `Rate` is one of the ~292 modules v6 marks
 * `"use client"`, and the two places a rating is displayed — `ProviderCard` and the
 * provider page's review section — are deliberately Server Components. Importing `Rate`
 * into either would pull antd's runtime into the bundle of every route that renders a
 * provider card. `Rate` is still the right control for *entering* a rating, inside the
 * client form; this is for showing one.
 *
 * A partial star is drawn by overlaying a clipped gold row on a grey one, rather than by
 * picking a half-star glyph: 4.3 renders as 4.3, and the two rows are the same path at
 * the same position, so they cannot drift apart at any size.
 */
export const RatingStars: FC<RatingStarsProps> = ({ value, size = 'md', label, className }) => {
  // Clamped because this renders an average straight off the API, and a value outside
  // 0–5 would set a CSS width over 100% — silently painting a sixth star's worth of gold
  // past the end of the row.
  const clamped = Math.max(0, Math.min(STAR_COUNT, value))
  const starClass = SIZE[size]

  const row = (tone: string) => (
    <span className={cn('flex', tone)}>
      {Array.from({ length: STAR_COUNT }, (_, index) => (
        <StarIcon key={index} className={starClass} />
      ))}
    </span>
  )

  return (
    <span
      className={cn('relative inline-flex shrink-0 align-middle', className)}
      // The visual is two overlaid rows of five identical glyphs, which a screen reader
      // would otherwise read as ten unlabelled images.
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {row('text-rating-empty')}
      <span
        className='absolute inset-0 overflow-hidden'
        // Inline because the width is a datum, not a design decision — it is the rating
        // itself. There is no Tailwind class for "86%", and an arbitrary-value class
        // would be a new one compiled per distinct average.
        style={{ width: `${(clamped / STAR_COUNT) * 100}%` }}
      >
        {row('text-rating')}
      </span>
    </span>
  )
}
