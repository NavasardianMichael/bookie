'use client'

import { FC, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { ProviderService } from '@store/providers/profile/types'
import { cn } from '@helpers/cn'
import { formatDuration, toIsoDuration } from '@helpers/duration'
import { AppText } from '@components/ui/bare/AppText'
import { AppTime } from '@components/ui/bare/AppTime'
import { ResponsiveGrid } from '@components/ui/layout/ResponsiveGrid'

type Props = {
  services: ProviderService[]
  value?: string
  onChange: (serviceId: string) => void
}

/**
 * Step one of booking, split out of the calendar block so the two questions —
 * *what* and *when* — read as two panels rather than a Segmented strip stacked
 * above a month grid.
 *
 * Native radios inside labels rather than antd `Radio`: a radio group already
 * gives arrow-key navigation and a single tab stop, and antd's unlayered
 * `.ant-radio-wrapper` rules would have to be beaten to turn its label into a
 * card. Everything inside the label is **phrasing content** — a card here is a
 * form option, not a section, so the service name is a `<strong>` and not a
 * heading; a heading inside `<label>` is invalid HTML.
 */
export const ServicePicker: FC<Props> = ({ services, value, onChange }) => {
  const t = useTranslations('Booking')
  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => onChange(event.target.value),
    [onChange]
  )

  return (
    <fieldset className='m-0 min-w-0 border-0 p-0'>
      <legend className='sr-only'>{t('legend')}</legend>

      <ResponsiveGrid as='ul' min='sm' gap='sm' className='m-0 list-none p-0'>
        {services.map((service) => {
          const selected = value === service.id

          return (
            <li key={service.id} className='min-w-0'>
              <label className='block h-full cursor-pointer'>
                <input
                  type='radio'
                  name='booking-service'
                  value={service.id}
                  checked={selected}
                  onChange={handleChange}
                  className='peer sr-only'
                />

                <span
                  className={cn(
                    'border-brand-border bg-surface flex h-full flex-col gap-0.5 rounded-brand border p-3 transition-all sm:p-4',
                    'peer-focus-visible:ring-brand/40 peer-focus-visible:ring-2 peer-focus-visible:ring-offset-2',
                    selected ? 'border-brand bg-brand-50 shadow-sm' : 'hover:border-brand/60 hover:shadow-sm'
                  )}
                >
                  <AppText as='strong' size='body-sm' tone='default' className='wrap-break-word font-semibold'>
                    {service.name}
                  </AppText>

                  <span className='flex flex-wrap items-center gap-x-2'>
                    <AppTime dateTime={toIsoDuration(service.duration)} className='text-caption'>
                      {formatDuration(service.duration)}
                    </AppTime>
                    {service.price !== undefined && service.currency && (
                      <>
                        <AppText aria-hidden='true' size='caption'>
                          ·
                        </AppText>
                        <AppText size='caption' tone='default' numeric className='font-semibold'>
                          {service.price} {service.currency}
                        </AppText>
                      </>
                    )}
                  </span>

                  {service.description && (
                    <AppText size='caption' tone='muted' className='mt-1 wrap-break-word'>
                      {service.description}
                    </AppText>
                  )}
                </span>
              </label>
            </li>
          )
        })}
      </ResponsiveGrid>
    </fieldset>
  )
}
