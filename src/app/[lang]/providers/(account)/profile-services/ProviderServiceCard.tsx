'use client'

import { FC, useCallback, useMemo } from 'react'
import { DeleteOutlined, EditOutlined, MoreOutlined } from '@ant-design/icons'
import { Button, Dropdown, Tag } from 'antd'
import Image from 'next/image'
import { ProviderService } from '@store/providers/profile/types'
import { cn } from '@helpers/cn'
import { formatDuration, toIsoDuration } from '@helpers/duration'
import { resolveAssetUrl } from '@helpers/images'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { AppText } from '@components/ui/bare/AppText'
import { AppTime } from '@components/ui/bare/AppTime'
import { AppTitle } from '@components/ui/bare/AppTitle'
import { ClockIcon, CreditCardIcon, ScissorsIcon } from '@components/ui/icons'

type Props = {
  service: ProviderService
  /** False when the service carries no price, which is what makes it unbookable. */
  isPriced: boolean
  onEdit: (serviceId: string) => void
  onDelete: (serviceId: string) => void
}

const MENU_KEYS = { edit: 'edit', delete: 'delete' } as const

/**
 * One service, as `manage_services` draws it: icon tile and an overflow menu on
 * the top row, name and clamped description in the body, then a ruled footer
 * carrying duration, price and a status tag.
 *
 * The two per-card actions live in a `Dropdown` rather than as a pair of icon
 * buttons because the footer is where the prototype puts status, not controls —
 * and a 3-column grid of cards each showing two always-on destructive-adjacent
 * buttons reads as a toolbar rather than a catalogue.
 */
export const ProviderServiceCard: FC<Props> = ({ service, isPriced, onEdit, onDelete }) => {
  const resolvedImage = resolveAssetUrl(service.image)

  const handleMenuClick = useCallback(
    ({ key }: { key: string }) => {
      if (key === MENU_KEYS.edit) onEdit(service.id)
      if (key === MENU_KEYS.delete) onDelete(service.id)
    },
    [onDelete, onEdit, service.id]
  )

  const items = useMemo(
    () => [
      { key: MENU_KEYS.edit, icon: <EditOutlined />, label: 'Edit service' },
      { key: MENU_KEYS.delete, icon: <DeleteOutlined />, label: 'Delete service', danger: true },
    ],
    []
  )

  return (
    <li
      className={cn(
        'bg-surface flex min-w-0 flex-col justify-between gap-4 rounded-brand border p-5 transition-shadow sm:p-6',
        isPriced ? 'border-brand-border hover:shadow-md' : 'border-brand-border border-dashed'
      )}
    >
      <div className='flex min-w-0 flex-col gap-2'>
        <div className='flex items-start justify-between gap-2'>
          <span
            className={cn(
              'relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-brand-sm',
              isPriced ? 'bg-brand-50 text-brand' : 'bg-surface-sunken text-brand-400'
            )}
          >
            {resolvedImage ? (
              <Image src={resolvedImage} alt='' fill sizes='48px' className='object-cover' />
            ) : (
              <ScissorsIcon aria-hidden className='h-5 w-5' />
            )}
          </span>

          <Dropdown menu={{ items, onClick: handleMenuClick }} trigger={['click']} placement='bottomRight'>
            <Button
              type='text'
              icon={<MoreOutlined />}
              aria-label={`Actions for ${service.name}`}
              className='min-h-11 min-w-11'
            />
          </Dropdown>
        </div>

        <AppTitle level='h3' className='line-clamp-1'>
          {service.name}
        </AppTitle>

        {service.description ? (
          <AppParagraph size='body-sm' className='m-0 line-clamp-2'>
            {service.description}
          </AppParagraph>
        ) : (
          <AppParagraph size='body-sm' className='m-0 line-clamp-2 italic'>
            No description yet.
          </AppParagraph>
        )}
      </div>

      <div className='border-brand-border-subtle flex flex-wrap items-center justify-between gap-3 border-t pt-4'>
        <div className='flex flex-wrap items-center gap-4'>
          <span className='text-brand-text flex items-center gap-1.5 font-semibold'>
            <ClockIcon aria-hidden className='h-4 w-4' />
            <AppTime dateTime={toIsoDuration(service.duration)} className='text-caption'>
              {formatDuration(service.duration)}
            </AppTime>
          </span>

          <span className={cn('flex items-center gap-1.5 font-semibold', !isPriced && 'text-brand-muted')}>
            <CreditCardIcon aria-hidden className='h-4 w-4' />
            <AppText size='caption' tone={isPriced ? 'default' : 'muted'} numeric>
              {isPriced ? `${service.price} ${service.currency ?? ''}`.trim() : 'No price'}
            </AppText>
          </span>
        </div>

        <Tag color={isPriced ? 'success' : undefined} className='m-0 uppercase'>
          {isPriced ? 'Active' : 'Incomplete'}
        </Tag>
      </div>
    </li>
  )
}
