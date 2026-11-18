'use client'

import { FC, KeyboardEvent, useEffect, useRef, useState } from 'react'
import { MessageOutlined, SendOutlined } from '@ant-design/icons'
import { useTranslations } from 'next-intl'
import { useVisitorAssistantChat } from '@hooks/useVisitorAssistantChat'
import { VISITOR_MESSAGE_MAX } from '@constants/assistant'
import { AssistantMessageItem } from '@components/assistant/AssistantMessageItem'
import { AppButton } from '@components/ui/AppButton'
import { AppSheet } from '@components/ui/AppSheet'
import { AppTextArea } from '@components/ui/AppTextArea'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { AppText } from '@components/ui/bare/AppText'
import { ErrorAlert } from '@components/ui/ErrorAlert'

type Props = {
  providerId: string
  providerName: string
}

/** Questions a visitor can start from. */
const EXAMPLES = ['services', 'weekend', 'price', 'payment'] as const

/**
 * "Ask a question" on a provider's public page — shown only when the provider switched the
 * assistant on and their plan allows it (`details.visitorAssistant`). Any visitor, signed in or
 * not. It answers from the page's public facts and cannot book or change anything; the booking
 * calendar stays the way to book. The conversation stays in this browser (localStorage, 30 days).
 */
export const VisitorAssistantButton: FC<Props> = ({ providerId, providerName }) => {
  const t = useTranslations('Assistant.visitor')
  const tAssistant = useTranslations('Assistant')
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const chat = useVisitorAssistantChat(providerId, open)
  const listEnd = useRef<HTMLDivElement>(null)
  const busy = chat.streaming !== null

  useEffect(() => {
    listEnd.current?.scrollIntoView({ block: 'end' })
  }, [chat.turns.length, chat.streaming])

  const submit = async (question = text.trim()): Promise<void> => {
    if (!question || busy) return
    if (await chat.send(question)) setText('')
  }

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return
    event.preventDefault()
    void submit()
  }

  return (
    <>
      <AppButton block icon={<MessageOutlined />} onClick={() => setOpen(true)} className='mt-4'>
        {t('button')}
      </AppButton>
      <AppSheet open={open} onClose={() => setOpen(false)} title={t('title', { name: providerName })}>
        <div className='flex min-h-[45dvh] flex-col gap-3'>
          <ul className='m-0 flex grow list-none flex-col gap-3 p-0' aria-live='polite'>
            {!chat.turns.length && !busy && (
              <li className='flex flex-col gap-3'>
                <AppParagraph size='body-sm'>{t('intro')}</AppParagraph>
                <div className='flex flex-wrap gap-2'>
                  {EXAMPLES.map((key) => (
                    <AppButton key={key} size='small' onClick={() => void submit(t(`examples.${key}`))}>
                      {t(`examples.${key}`)}
                    </AppButton>
                  ))}
                </div>
              </li>
            )}
            {chat.turns.map((turn, index) => (
              <AssistantMessageItem key={index} from={turn.role} text={turn.text} />
            ))}
            {busy && <AssistantMessageItem from='model' text={chat.streaming ?? ''} streaming />}
          </ul>
          <div ref={listEnd} />

          {chat.error !== null && <ErrorAlert error={chat.error} />}

          <div className='flex items-end gap-2'>
            <AppTextArea
              className='grow'
              value={text}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={onKeyDown}
              maxLength={VISITOR_MESSAGE_MAX}
              autoSize={{ minRows: 1, maxRows: 4 }}
              placeholder={t('placeholder')}
              aria-label={t('placeholder')}
            />
            <AppButton
              type='primary'
              icon={<SendOutlined />}
              aria-label={tAssistant('composer.send')}
              loading={busy}
              disabled={!text.trim()}
              onClick={() => void submit()}
            />
          </div>
          <div className='flex flex-wrap items-center justify-between gap-2'>
            <AppText size='caption' tone='muted'>
              {t('disclaimer')}
            </AppText>
            {chat.turns.length > 0 && !busy && (
              <AppButton size='small' type='text' onClick={chat.clear}>
                {t('clear')}
              </AppButton>
            )}
          </div>
        </div>
      </AppSheet>
    </>
  )
}
