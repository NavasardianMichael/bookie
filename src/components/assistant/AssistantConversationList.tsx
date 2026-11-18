'use client'

import { FC } from 'react'
import dayjs from 'dayjs'
import { useTranslations } from 'next-intl'
import { AssistantConversation } from '@api/assistant/types'
import { TimeFormat } from '@interfaces/schedule'
import { cn } from '@helpers/cn'
import { getTimeDisplayFormat } from '@helpers/timeFormat'
import { AppText } from '@components/ui/bare/AppText'

type Props = {
  conversations: AssistantConversation[]
  activeId: string | null
  timeFormat: TimeFormat
  onSelect: (id: string) => void
  /** A reply is streaming: switching now would leave it writing into a chat no longer shown. */
  disabled?: boolean
  className?: string
}

/**
 * The provider's assistant chats, newest activity first: each one's title (its first message; a
 * diary photo's when it had no note) and when it was last used — a time today, a date before.
 * The side column of the expanded panel, and the list the corner panel switches to.
 */
export const AssistantConversationList: FC<Props> = ({
  conversations,
  activeId,
  timeFormat,
  onSelect,
  disabled = false,
  className,
}) => {
  const t = useTranslations('Assistant.conversations')
  const timeDisplay = getTimeDisplayFormat(timeFormat)

  // The browser's own clock: these are the provider's own moments, read on their own device.
  const when = (iso: string): string => {
    const moment = dayjs(iso)
    return moment.isSame(dayjs(), 'day') ? moment.format(timeDisplay) : moment.format('D MMM')
  }

  if (!conversations.length) {
    return (
      <AppText size='body-sm' tone='muted' className={cn('block p-4', className)}>
        {t('empty')}
      </AppText>
    )
  }

  return (
    <nav aria-label={t('list')} className={className}>
      <ul className='m-0 flex list-none flex-col gap-1 p-2'>
        {conversations.map((conversation) => {
          const active = conversation.id === activeId
          return (
            <li key={conversation.id}>
              <button
                type='button'
                onClick={() => onSelect(conversation.id)}
                disabled={disabled}
                aria-current={active ? 'true' : undefined}
                className={cn(
                  'flex w-full cursor-pointer flex-col gap-0.5 rounded-brand-sm border-0 bg-transparent px-3 py-2 text-start transition-colors',
                  'hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-60',
                  active && 'bg-brand-50 font-semibold'
                )}
              >
                <AppText size='body-sm' className='line-clamp-2'>
                  {conversation.title || t('photo')}
                </AppText>
                <AppText size='caption' tone='muted'>
                  {when(conversation.updatedAt)}
                </AppText>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
