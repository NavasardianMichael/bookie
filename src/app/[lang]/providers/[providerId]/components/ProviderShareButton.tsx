'use client'

import { FC } from 'react'
import { App } from 'antd'
import { useTranslations } from 'next-intl'
import { AppButton } from '@components/ui/AppButton'
import { ShareIcon } from '@components/ui/icons'

type Props = {
  /** Used as the Web Share sheet title when the platform supports it. */
  name: string
}

/**
 * Copies or native-shares the URL in the address bar — that is the page the
 * visitor is looking at, locale prefix included.
 *
 * `navigator.share` is the phone path; clipboard is the fallback, with the same
 * toast the settings copy-URL control uses. A cancelled share sheet is a no-op.
 */
export const ProviderShareButton: FC<Props> = ({ name }) => {
  const t = useTranslations('Common')
  const { message } = App.useApp()

  const onShare = async () => {
    const url = window.location.href

    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: name, url })
        return
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
      }
    }

    try {
      await navigator.clipboard.writeText(url)
      message.success(t('linkCopied'))
    } catch {
      message.error(t('copyFailed'))
    }
  }

  // Position the wrapper, not the Button: antd's unlayered `position: relative`
  // beats Tailwind `absolute` on the control itself.
  return (
    <div className='absolute top-3 inset-e-3 z-10'>
      <AppButton
        type='text'
        shape='circle'
        className='text-brand-muted hover:text-brand'
        icon={<ShareIcon className='h-5 w-5' />}
        aria-label={t('share')}
        onClick={() => void onShare()}
      />
    </div>
  )
}
