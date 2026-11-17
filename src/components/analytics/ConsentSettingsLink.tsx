'use client'

import { FC } from 'react'
import { useTranslations } from 'next-intl'
import { GA_MEASUREMENT_ID } from '@constants/monitoring'
import { cn } from '@helpers/cn'
import { openConsentBanner } from '@helpers/consent'

type Props = {
  className?: string
}

/**
 * The footer's way back to the analytics banner, to change the answer — offered in every
 * region, since a visitor who was never asked may still want to say no. Nothing without a GA tag.
 */
export const ConsentSettingsLink: FC<Props> = ({ className }) => {
  const t = useTranslations('Consent')
  if (!GA_MEASUREMENT_ID) return null
  return (
    <button
      type='button'
      className={cn('cursor-pointer border-0 bg-transparent p-0 font-[inherit]', className)}
      onClick={openConsentBanner}
    >
      {t('settings')}
    </button>
  )
}
