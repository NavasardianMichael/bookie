'use client'

import { FC } from 'react'
import { App } from 'antd'
import { useTranslations } from 'next-intl'
import { cn } from '@helpers/cn'
import { AppButton } from './AppButton'
import { APP_LINK_META_CLASS, AppLink } from './bare/AppLink'
import { CopyIcon } from './icons'

type Props = {
  href: string
  text: string
  copyLabel: string
  /** Maps (and similar) open in a new tab; `tel:` / `mailto:` stay in-page. */
  openInNewTab?: boolean
}

/**
 * A value that is both a link and copyable: the text is the href's visible label,
 * and a trailing icon copies the *text* (the address or number), not the URL.
 */
export const CopyableLinkValue: FC<Props> = ({ href, text, copyLabel, openInNewTab }) => {
  const t = useTranslations('Common')
  const { message } = App.useApp()

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      message.success(t('copied'))
    } catch {
      message.error(t('copyFailed'))
    }
  }

  return (
    <span className='flex w-full min-w-0 items-start gap-1'>
      <AppLink
        href={href}
        variant='plain'
        target={openInNewTab ? '_blank' : undefined}
        className={cn(APP_LINK_META_CLASS, 'min-w-0 flex-1')}
      >
        {text}
      </AppLink>
      <AppButton
        type='text'
        shape='circle'
        size='small'
        className='copyable-link-copy shrink-0'
        icon={<CopyIcon className='h-4 w-4' />}
        aria-label={copyLabel}
        onClick={() => void copy()}
      />
    </span>
  )
}
