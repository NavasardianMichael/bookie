'use client'

import { FC } from 'react'
import { ShopOutlined } from '@ant-design/icons'
import { useTranslations } from 'next-intl'
import { ROUTES } from '@constants/routes'
import { AppLink } from '@components/ui/bare/AppLink'
import { AppText } from '@components/ui/bare/AppText'

/**
 * The workspace switch's place for an account that holds only a Consumer profile: there
 * is no provider half to switch to yet, so it offers to create one. Same banner, same
 * position above the panel, so the gesture that later becomes "Switch" starts here.
 */
export const BecomeProviderPrompt: FC = () => {
  const t = useTranslations('Settings.workspace')

  return (
    <div className='border-brand-border bg-brand-50 mb-6 flex flex-wrap items-center justify-between gap-3 rounded-brand border p-4'>
      <div className='min-w-0'>
        <AppText size='body-sm' className='block font-semibold'>
          {t('becomeProviderTitle')}
        </AppText>
        <AppText size='caption' tone='muted' className='block'>
          {t('becomeProviderBody')}
        </AppText>
      </div>

      <AppLink
        href={ROUTES.consumerBecomeProvider}
        variant='button'
        tone='primary'
        className='h-auto min-h-8 shrink-0 whitespace-normal py-2 text-center'
      >
        <ShopOutlined aria-hidden />
        {t('becomeProvider')}
      </AppLink>
    </div>
  )
}
