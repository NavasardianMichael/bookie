import { FC, ReactNode } from 'react'
import { cn } from '@helpers/cn'
import { AppText } from './bare/AppText'
import { Surface } from './layout/Surface'

export type StatTileProps = {
  label: ReactNode
  value: ReactNode
  /** Rendered in a tinted chip. `row` puts it beside the number, `stack` omits the chip. */
  icon?: ReactNode
  /** A delta or qualifier under the number. */
  hint?: ReactNode
  /** A link or button pinned to the bottom of the tile. */
  action?: ReactNode
  layout?: 'row' | 'stack'
  /** `brand` is the filled navy tile that closes the dashboard's stat row. */
  tone?: 'default' | 'brand'
  className?: string
}

/**
 * The prototypes' stat card, in the two shapes they use it: `row` (icon chip
 * beside a label and a number — manage_services) and `stack` (overline label,
 * big number, delta line — provider_calendar_dashboard).
 *
 * antd-free, so a page that has real numbers on the server can render them into
 * the HTML rather than after hydration. `value` is `tnum` because a row of these
 * side by side reads as a table.
 */
export const StatTile: FC<StatTileProps> = ({
  label,
  value,
  icon,
  hint,
  action,
  layout = 'stack',
  tone = 'default',
  className,
}) => {
  const inverse = tone === 'brand'

  const labelNode = (
    <AppText
      size={layout === 'row' ? 'body-sm' : 'overline'}
      tone={inverse ? 'inverse' : 'muted'}
      className={cn('font-semibold', layout === 'row' ? '' : 'tracking-wider', inverse && 'opacity-80')}
    >
      {label}
    </AppText>
  )

  // A stat number is data, not a section title, so it stays a <p> and never
  // enters the document outline.
  const valueNode = (
    <p className={cn('text-h2 tnum m-0 font-extrabold', inverse ? 'text-white' : 'text-brand-text')}>{value}</p>
  )

  return (
    <Surface
      padding='md'
      className={cn(
        'flex min-w-0 flex-col gap-4',
        inverse && 'bg-brand border-brand text-white shadow-md',
        className
      )}
    >
      {layout === 'row' ? (
        <div className='flex min-w-0 items-center gap-4'>
          {icon && (
            <span
              aria-hidden
              className={cn(
                'flex size-11 shrink-0 items-center justify-center rounded-brand-sm',
                inverse ? 'bg-white/15 text-white' : 'bg-brand-50 text-brand'
              )}
            >
              {icon}
            </span>
          )}
          <span className='flex min-w-0 flex-col gap-0.5'>
            {labelNode}
            {valueNode}
          </span>
        </div>
      ) : (
        <div className='flex min-w-0 flex-col gap-1'>
          {labelNode}
          {valueNode}
        </div>
      )}

      {hint && (
        <AppText
          size='caption'
          tone={inverse ? 'inverse' : 'muted'}
          className={cn('mt-auto font-semibold', inverse && 'opacity-80')}
        >
          {hint}
        </AppText>
      )}

      {action && <div className='mt-auto'>{action}</div>}
    </Surface>
  )
}
