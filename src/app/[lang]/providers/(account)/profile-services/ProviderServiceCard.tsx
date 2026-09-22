'use client'

import { FC, useCallback, useMemo, useState } from 'react'
import { DeleteOutlined, EditOutlined, MoreOutlined } from '@ant-design/icons'
import { App, Button, Dropdown, Switch, Tag } from 'antd'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { ProviderService } from '@store/providers/profile/types'
import { cn } from '@helpers/cn'
import { formatDuration, toIsoDuration } from '@helpers/duration'
import { processError } from '@helpers/error'
import { resolveAssetUrl } from '@helpers/images'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { AppText } from '@components/ui/bare/AppText'
import { AppTime } from '@components/ui/bare/AppTime'
import { AppTitle } from '@components/ui/bare/AppTitle'
import { ClockIcon, CreditCardIcon, ScissorsIcon } from '@components/ui/icons'

type Props = {
  service: ProviderService
  onEdit: (serviceId: string) => void
  onDelete: (serviceId: string) => void
  onToggleActive: (serviceId: string, active: boolean) => Promise<void>
}

const MENU_KEYS = { edit: 'edit', delete: 'delete' } as const

/**
 * One service, as `manage_services` draws it: icon tile and an overflow menu on
 * the top row, name and clamped description in the body, then a ruled footer
 * carrying duration, price and an activate/deactivate switch.
 *
 * The two per-card actions live in a `Dropdown` rather than as a pair of icon
 * buttons because the footer is where status lives, not controls — and a
 * 3-column grid of cards each showing two always-on destructive-adjacent
 * buttons reads as a toolbar rather than a catalogue.
 */
export const ProviderServiceCard: FC<Props> = ({ service, onEdit, onDelete, onToggleActive }) => {
  const t = useTranslations('Services')
  const { message } = App.useApp()
  const resolvedImage = resolveAssetUrl(service.image)
  const hasPrice = typeof service.price === 'number'
  const [isToggling, setIsToggling] = useState(false)

  const handleMenuClick = useCallback(
    ({ key }: { key: string }) => {
      if (key === MENU_KEYS.edit) onEdit(service.id)
      if (key === MENU_KEYS.delete) onDelete(service.id)
    },
    [onDelete, onEdit, service.id]
  )

  const handleToggle = useCallback(
    async (active: boolean) => {
      setIsToggling(true)
      try {
        await onToggleActive(service.id, active)
      } catch (error) {
        message.error(processError(error).message)
      } finally {
        setIsToggling(false)
      }
    },
    [message, onToggleActive, service.id]
  )

  const items = useMemo(
    () => [
      { key: MENU_KEYS.edit, icon: <EditOutlined />, label: t('edit') },
      { key: MENU_KEYS.delete, icon: <DeleteOutlined />, label: t('deleteService'), danger: true },
    ],
    [t]
  )

  return (
    <li
      className={cn(
        'bg-surface flex min-w-0 flex-col justify-between gap-4 rounded-brand border p-3 transition-shadow sm:p-4',
        service.active ? 'border-brand-border hover:shadow-md' : 'border-brand-border border-dashed'
      )}
    >
      <div className='flex min-w-0 flex-col gap-2'>
        <div className='flex items-start justify-between gap-2'>
          <span
            className={cn(
              'relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-brand-sm',
              service.active ? 'bg-brand-50 text-brand' : 'bg-surface-sunken text-brand-400'
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
              aria-label={t('actionsFor', { name: service.name })}
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
            {t('noDescription')}
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

          <span className={cn('flex items-center gap-1.5 font-semibold', !hasPrice && 'text-brand-muted')}>
            <CreditCardIcon aria-hidden className='h-4 w-4' />
            <AppText size='caption' tone={hasPrice ? 'default' : 'muted'} numeric>
              {hasPrice ? `${service.price} ${service.currency ?? ''}`.trim() : t('noPrice')}
            </AppText>
          </span>
        </div>

        <div className='flex items-center gap-2'>
          <Tag color={service.active ? 'success' : undefined} className='m-0 uppercase'>
            {service.active ? t('active') : t('inactive')}
          </Tag>
          <Switch
            checked={service.active}
            loading={isToggling}
            onChange={handleToggle}
            aria-label={t(service.active ? 'deactivate' : 'activate', { name: service.name })}
          />
        </div>
      </div>
    </li>
  )
}
