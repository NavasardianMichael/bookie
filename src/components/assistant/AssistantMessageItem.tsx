'use client'

import { FC, ReactNode } from 'react'
import { CameraOutlined } from '@ant-design/icons'
import { useTranslations } from 'next-intl'
import { AssistantMessage } from '@api/assistant/types'
import { cn } from '@helpers/cn'
import { AppText } from '@components/ui/bare/AppText'

type Props = {
  /** Whose turn it is. Not `role`: that name is an ARIA attribute to every reader of JSX. */
  from: AssistantMessage['role']
  text: string
  /** The provider's turn carried a photo. */
  photo?: boolean
  /** A proposal or photo card under the words. */
  children?: ReactNode
  /** The reply is still being written. */
  streaming?: boolean
}

/**
 * One turn of a chat — the provider's on the end side, the assistant's on the start side —
 * with any card under it. Plain text with its line breaks kept: the model's words are never
 * rendered as HTML. Shared by the provider's assistant and the public page's.
 */
export const AssistantMessageItem: FC<Props> = ({ from, text, photo = false, children, streaming = false }) => {
  const t = useTranslations('Assistant')
  const mine = from === 'user'

  return (
    <li className={cn('flex flex-col gap-2', mine ? 'items-end' : 'items-start')}>
      {(text || photo || streaming) && (
        <div
          className={cn(
            'max-w-[85%] rounded-brand px-3 py-2',
            mine ? 'bg-brand text-white' : 'bg-surface-sunken border-brand-border border'
          )}
        >
          {photo && (
            <AppText size='body-sm' tone={mine ? 'inverse' : 'muted'} className='flex items-center gap-1.5'>
              <CameraOutlined aria-hidden />
              {t('photoSent')}
            </AppText>
          )}
          {text && (
            <AppText size='body-sm' tone={mine ? 'inverse' : 'default'} className='block whitespace-pre-wrap wrap-break-word'>
              {text}
            </AppText>
          )}
          {streaming && (
            <span aria-label={t('writing')} className='inline-flex gap-1 align-middle'>
              {[0, 1, 2].map((dot) => (
                <span
                  key={dot}
                  aria-hidden
                  className='bg-brand-muted size-1.5 animate-pulse rounded-full'
                  style={{ animationDelay: `${dot * 150}ms` }}
                />
              ))}
            </span>
          )}
        </div>
      )}
      {children && <div className='w-full max-w-[95%]'>{children}</div>}
    </li>
  )
}
