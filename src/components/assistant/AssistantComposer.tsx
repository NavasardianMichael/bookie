'use client'

import { FC, KeyboardEvent, useState } from 'react'
import { CameraOutlined, SendOutlined } from '@ant-design/icons'
import { useTranslations } from 'next-intl'
import { ASSISTANT_MESSAGE_MAX } from '@constants/assistant'
import { cn } from '@helpers/cn'
import { AppButton } from '@components/ui/AppButton'
import { AppTextArea } from '@components/ui/AppTextArea'
import { AppText } from '@components/ui/bare/AppText'

/** The counter appears once a message passes this share of the limit — before that it is noise. */
const COUNTER_FROM = 0.8

type Props = {
  /** Resolves `true` when the message went through — only then is the box cleared. */
  onSend: (text: string) => Promise<boolean>
  onPhoto: () => void
  disabled?: boolean
  /** Filled in from an example prompt. */
  draft?: string
  onDraftChange?: (text: string) => void
}

/**
 * The message box, as chat apps draw it: one rounded field with the camera (a photo of a paper
 * diary) inside its start and a round send button inside its end. Up to `ASSISTANT_MESSAGE_MAX`
 * characters — the count shows only near the limit. Enter sends, Shift+Enter is a new line. A
 * message that fails stays in the box to send again.
 */
export const AssistantComposer: FC<Props> = ({ onSend, onPhoto, disabled = false, draft, onDraftChange }) => {
  const t = useTranslations('Assistant.composer')
  const [ownText, setOwnText] = useState('')
  const text = draft ?? ownText
  const setText = onDraftChange ?? setOwnText
  const [sending, setSending] = useState(false)
  const trimmed = text.trim()

  const submit = async (): Promise<void> => {
    if (!trimmed || sending || disabled) return
    setSending(true)
    const sent = await onSend(trimmed)
    setSending(false)
    if (sent) setText('')
  }

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return
    event.preventDefault()
    void submit()
  }

  return (
    <div className='flex flex-col gap-1'>
      <div
        className={cn(
          'border-brand-border bg-surface flex items-end gap-1 rounded-3xl border p-1.5 transition-colors',
          // The field's focus state: the whole box, not the textarea inside it.
          'focus-within:border-brand focus-within:ring-brand/15 focus-within:ring-2',
          disabled && 'opacity-60'
        )}
      >
        <AppButton
          type='text'
          shape='circle'
          className='text-brand-muted hover:text-brand shrink-0'
          icon={<CameraOutlined />}
          aria-label={t('photo')}
          title={t('photo')}
          disabled={disabled || sending}
          onClick={onPhoto}
        />
        <AppTextArea
          className='grow'
          variant='borderless'
          // Inline, because the global `*:focus-visible` ring is unlayered and beats any utility.
          styles={{ textarea: { outline: 'none' } }}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={onKeyDown}
          maxLength={ASSISTANT_MESSAGE_MAX}
          showCount={false}
          autoSize={{ minRows: 1, maxRows: 6 }}
          placeholder={t('placeholder')}
          aria-label={t('label')}
          disabled={disabled}
        />
        <AppButton
          type='primary'
          shape='circle'
          className='shrink-0'
          icon={<SendOutlined />}
          aria-label={t('send')}
          title={t('send')}
          loading={sending}
          disabled={disabled || !trimmed}
          onClick={() => void submit()}
        />
      </div>
      {text.length >= ASSISTANT_MESSAGE_MAX * COUNTER_FROM && (
        <AppText size='caption' tone='muted' numeric className='self-end pe-3'>
          {text.length}/{ASSISTANT_MESSAGE_MAX}
        </AppText>
      )}
    </div>
  )
}
