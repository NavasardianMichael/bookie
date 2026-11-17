'use client'

import { FC, useSyncExternalStore } from 'react'
import { CloseOutlined } from '@ant-design/icons'
import { useTranslations } from 'next-intl'
import { ROUTES } from '@constants/routes'
import {
  dismissConsentBanner,
  isConsentBannerOpen,
  saveConsent,
  subscribeConsentBanner,
} from '@helpers/consent'
import { AppButton } from '@components/ui/AppButton'
import { APP_LINK_AUX_CLASS, AppLink } from '@components/ui/bare/AppLink'

/**
 * Asks once whether Google Analytics may set its cookies — only where an opt-in is needed
 * (`helpers/consent.ts`); elsewhere they are on from the start and this never renders. Until
 * the visitor answers, analytics runs cookieless. ✕ hides it without answering. Comes back
 * from "Cookie settings" in the footer. Not a modal: the page stays usable while it is open.
 */
export const ConsentBanner: FC = () => {
  const t = useTranslations('Consent')
  const tCommon = useTranslations('Common')
  // Closed in the server render: the answer lives in the browser.
  const open = useSyncExternalStore(subscribeConsentBanner, isConsentBannerOpen, () => false)

  if (!open) return null

  return (
    <section aria-label={t('label')} className='fixed inset-x-0 bottom-0 z-50 px-3 pb-3 app-safe-b'>
      <div className='bg-surface border-brand-border rounded-brand relative mx-auto flex max-w-3xl flex-col gap-3 border p-4 pe-12 shadow-xl sm:flex-row sm:items-center sm:gap-4'>
        <p className='text-body-sm m-0'>
          {t('text')}{' '}
          <AppLink href={ROUTES.privacy} className={APP_LINK_AUX_CLASS}>
            {t('privacy')}
          </AppLink>
        </p>
        <div className='flex shrink-0 gap-2 sm:ms-auto'>
          <AppButton className='flex-1 sm:flex-none' onClick={() => saveConsent('denied')}>
            {t('decline')}
          </AppButton>
          <AppButton type='primary' className='flex-1 sm:flex-none' onClick={() => saveConsent('granted')}>
            {t('accept')}
          </AppButton>
        </div>
        {/* Last in the tab order. Not a yes — it only hides the banner until the next load. */}
        <AppButton
          type='text'
          size='small'
          className='absolute end-2 top-2'
          icon={<CloseOutlined />}
          aria-label={tCommon('close')}
          onClick={dismissConsentBanner}
        />
      </div>
    </section>
  )
}
