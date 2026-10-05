'use client'

import { FC } from 'react'
import { useTranslations } from 'next-intl'
import { cn } from '@helpers/cn'
import { AppButton } from '@components/ui/AppButton'
import { requestPublicBookNow } from './publicBookingCta'

type Props = {
  className?: string
}

/**
 * Mobile-only Book now in the identity card. Asks the booking column (via
 * `PUBLIC_BOOK_NOW_EVENT`) to scroll to whatever step is still missing, or to open
 * the confirm sheet when service and time are already picked.
 */
export const ProviderBookNowButton: FC<Props> = ({ className }) => {
  const t = useTranslations('Booking')

  return (
    <AppButton
      type='primary'
      onClick={requestPublicBookNow}
      className={cn('w-full lg:hidden', className)}
    >
      {t('bookNow')}
    </AppButton>
  )
}
