'use client'

import { FC } from 'react'
import { DeleteOutlined, EditOutlined, UndoOutlined } from '@ant-design/icons'
import { Tag } from 'antd'
import { useFormatter, useTranslations } from 'next-intl'
import { AssistantService } from '@api/profileAssistant/types'
import { cn } from '@helpers/cn'
import { formatDuration } from '@helpers/duration'
import { ServiceStatus } from '@helpers/profileAssistant'
import { AppButton } from '@components/ui/AppButton'
import { AppText } from '@components/ui/bare/AppText'

type Props = {
  service: AssistantService
  status: ServiceStatus | 'removed'
  onEdit?: () => void
  onRemove?: () => void
  onRestore?: () => void
}

/** antd `Tag` preset colours per status — new stands out, kept recedes. */
const STATUS_COLOR: Record<Props['status'], string | undefined> = {
  new: 'green',
  changed: 'blue',
  kept: undefined,
  removed: 'red',
}

const STATUS_KEY = {
  new: 'statusNew',
  changed: 'statusChanged',
  kept: 'statusKept',
  removed: 'statusRemoved',
} as const

/** One service in the review: what it is, what the draft does to it, and its actions. */
export const AssistantServiceRow: FC<Props> = ({ service, status, onEdit, onRemove, onRestore }) => {
  const t = useTranslations('Settings.assistant')
  const format = useFormatter()
  const price =
    service.price === null
      ? t('noPrice')
      : service.currency && /^[A-Z]{3}$/.test(service.currency)
        ? format.number(service.price, { style: 'currency', currency: service.currency })
        : `${format.number(service.price)}${service.currency ? ` ${service.currency}` : ''}`

  return (
    <div
      className={cn(
        'border-brand-border flex items-start justify-between gap-3 rounded-brand border p-3',
        status === 'removed' && 'border-dashed opacity-70'
      )}
    >
      <div className='flex min-w-0 flex-col gap-1'>
        <div className='flex flex-wrap items-center gap-2'>
          <AppText className={cn('font-semibold', status === 'removed' && 'line-through')}>{service.name}</AppText>
          <Tag color={STATUS_COLOR[status]} className='m-0'>
            {t(STATUS_KEY[status])}
          </Tag>
        </div>
        <AppText size='body-sm' tone='muted'>
          {formatDuration(service.duration)} · {price}
        </AppText>
        {service.description && (
          <AppText size='body-sm' tone='muted' className='line-clamp-2'>
            {service.description}
          </AppText>
        )}
      </div>

      <div className='flex shrink-0 gap-1'>
        {onEdit && <AppButton type='text' icon={<EditOutlined />} aria-label={t('editService')} onClick={onEdit} />}
        {onRemove && (
          <AppButton type='text' danger icon={<DeleteOutlined />} aria-label={t('removeService')} onClick={onRemove} />
        )}
        {onRestore && (
          <AppButton type='text' icon={<UndoOutlined />} onClick={onRestore}>
            {t('restoreService')}
          </AppButton>
        )}
      </div>
    </div>
  )
}
