'use client'

import { FC, useState } from 'react'
import { CameraOutlined } from '@ant-design/icons'
import { Tag } from 'antd'
import { useTranslations } from 'next-intl'
import { AssistantMessage } from '@api/assistant/types'
import { BookingDraft } from '@api/bookingImport/types'
import { PhotoImportSheet } from '@components/bookingImport/PhotoImportSheet'
import { AppButton } from '@components/ui/AppButton'
import { AppText } from '@components/ui/bare/AppText'

type Props = {
  message: AssistantMessage
  drafts: BookingDraft[]
  /** The reviewed bookings went in. */
  onImported: (count: number) => Promise<void>
  onDismiss: () => Promise<void>
}

const STATUS_COLOR = { pending: 'processing', applied: 'success', partial: 'warning', dismissed: 'default' } as const

/**
 * The bookings read off a photo the provider sent in the chat. Nothing is added from here
 * directly: **Review and add** opens the same review as *Import from photo* on `/bookings`,
 * where every booking is checked against the calendar before any is saved.
 */
export const AssistantPhotoCard: FC<Props> = ({ message, drafts, onImported, onDismiss }) => {
  const t = useTranslations('Assistant.photo')
  const tAssistant = useTranslations('Assistant')
  const [reviewing, setReviewing] = useState(false)
  const [dismissing, setDismissing] = useState(false)
  const status = message.proposalStatus
  const created = message.outcome && !Array.isArray(message.outcome) ? message.outcome.created : null

  if (!drafts.length) {
    return (
      <AppText size='body-sm' tone='muted' className='block'>
        {t('none')}
      </AppText>
    )
  }

  return (
    <div className='border-brand-border bg-surface flex flex-col gap-3 rounded-brand border p-4'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <AppText className='flex items-center gap-2 font-semibold'>
          <CameraOutlined aria-hidden className='text-brand' />
          {t('read', { count: drafts.length })}
        </AppText>
        {status && <Tag color={STATUS_COLOR[status]}>{tAssistant(`proposal.status.${status}`)}</Tag>}
      </div>
      {created !== null && (
        <AppText size='body-sm' tone='muted' className='block'>
          {t('added', { count: created })}
        </AppText>
      )}
      {status === 'pending' && (
        <div className='flex flex-wrap gap-2'>
          <AppButton type='primary' onClick={() => setReviewing(true)}>
            {t('review')}
          </AppButton>
          <AppButton
            loading={dismissing}
            onClick={() => {
              setDismissing(true)
              void onDismiss().finally(() => setDismissing(false))
            }}
          >
            {tAssistant('proposal.dismiss')}
          </AppButton>
        </div>
      )}
      <PhotoImportSheet
        open={reviewing}
        drafts={drafts}
        onClose={() => setReviewing(false)}
        onImported={(count) => {
          setReviewing(false)
          void onImported(count)
        }}
      />
    </div>
  )
}
