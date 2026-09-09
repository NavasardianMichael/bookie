import { FC, ReactNode } from 'react'
import { cn } from '@helpers/cn'
import { AppText } from './AppText'
import { AppTitle } from './AppTitle'

export type BarChartDatum = {
  key: string
  /** Axis label. Thinned automatically when there are more than the axis can read. */
  label: string
  value: number
  /** What the hover tooltip and the accessible table call this bar. Defaults to `label`. */
  name?: string
}

export type BarChartProps = {
  title: string
  data: BarChartDatum[]
  /** A line under the title — a total, a range, a unit. */
  caption?: ReactNode
  /** Renders a value for the tooltip, the table and the peak label. */
  formatValue?: (value: number) => string
  /** Shown in place of the plot when every value is zero. */
  emptyLabel: string
  /** Accessible name for the value column of the fallback table. */
  valueLabel: string
  className?: string
}

/**
 * A single-series bar chart, in divs rather than SVG and with no charting library.
 *
 * **Why divs.** A bar chart is a row of rectangles with a shared baseline, which CSS
 * grid already draws — going through SVG would mean a `viewBox`, manual scaling and
 * pixel geometry, and `src/styles/CLAUDE.md` puts every magic px in `tokens.ts`. In divs
 * the bars are token-native, responsive by construction, and every colour is a class the
 * rest of the app already uses.
 *
 * **Why antd-free.** Same reason `StatTile` is: a provider's numbers are fetched and
 * known before render, so they belong in the HTML rather than arriving after hydration.
 *
 * **One series, so one colour and no legend** — the title names what is being counted.
 * Every bar is the same hue on purpose: colouring the tallest one differently would make
 * colour follow rank rather than identity, so the chart would repaint itself whenever the
 * data moved and the eye would read a category that is not there.
 *
 * **No number on every bar.** The peak gets a direct label where the bars are wide enough
 * to hold one; every bar carries its value in a native `title` tooltip, which needs no
 * JavaScript and survives server rendering. The `sr-only` table underneath is the real
 * accessible alternative — a screen reader gets the figures, not a description of a
 * picture of them.
 */
export const BarChart: FC<BarChartProps> = ({
  title,
  data,
  caption,
  formatValue = (value) => String(value),
  emptyLabel,
  valueLabel,
  className,
}) => {
  const peak = data.reduce((max, datum) => Math.max(max, datum.value), 0)
  // Label every bar while they are readable, then every other, then every fifth. Beyond
  // that the axis is a texture rather than a scale, and the tooltip carries the detail.
  const labelStep = data.length <= 12 ? 1 : data.length <= 24 ? 2 : Math.ceil(data.length / 10)

  return (
    <figure className={cn('m-0 flex flex-col gap-4', className)}>
      <figcaption className='flex flex-col gap-1'>
        <AppTitle level='h3' size='h3'>
          {title}
        </AppTitle>
        {caption && (
          <AppText size='body-sm' tone='muted'>
            {caption}
          </AppText>
        )}
      </figcaption>

      {peak === 0 ? (
        <div className='bg-surface-sunken rounded-brand flex min-h-32 items-center justify-center p-6'>
          <AppText size='body-sm' tone='muted'>
            {emptyLabel}
          </AppText>
        </div>
      ) : (
        <div aria-hidden className='flex flex-col gap-2'>
          {/* `items-end` is the shared baseline; the 2px gap is the surface spacer the
              bars need to read as separate marks rather than one block. */}
          <div className='flex h-40 items-end gap-0.5'>
            {data.map((datum) => {
              const share = datum.value / peak
              // Only where a label has room to sit without colliding with its neighbours.
              const showValue = labelStep === 1 && datum.value === peak
              return (
                <div
                  key={datum.key}
                  title={`${datum.name ?? datum.label}: ${formatValue(datum.value)}`}
                  className='group relative flex h-full min-w-0 flex-1 cursor-default flex-col justify-end'
                >
                  {/* The track makes the whole column a hover target rather than only
                      the painted part, so a short bar is as easy to inspect as a tall one. */}
                  <span className='group-hover:bg-brand-50 rounded-t-brand-sm absolute inset-0 transition-colors' />
                  {showValue && (
                    <AppText size='caption' tone='muted' className='relative block text-center font-semibold'>
                      {formatValue(datum.value)}
                    </AppText>
                  )}
                  <span
                    className='bg-brand-400 group-hover:bg-brand-600 rounded-t-brand-sm relative w-full transition-colors'
                    // The one inline style in this component: a bar's height is data,
                    // not design, so it cannot be a class. Floored so a non-zero day is
                    // never invisible, which would read as no bookings at all.
                    style={{ height: `${Math.max(share * 100, datum.value > 0 ? 2 : 0)}%` }}
                  />
                </div>
              )
            })}
          </div>

          <div className='flex gap-0.5'>
            {data.map((datum, index) => (
              <div key={datum.key} className='min-w-0 flex-1 text-center'>
                {index % labelStep === 0 && (
                  <AppText size='caption' tone='muted' className='block truncate'>
                    {datum.label}
                  </AppText>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* The accessible alternative. Visually hidden rather than absent, because the
          plot above is `aria-hidden` — a screen reader reads the numbers, not a
          description of the picture. */}
      <table className='sr-only'>
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope='col'>{valueLabel}</th>
            <th scope='col'>{title}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((datum) => (
            <tr key={datum.key}>
              <th scope='row'>{datum.name ?? datum.label}</th>
              <td>{formatValue(datum.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}
