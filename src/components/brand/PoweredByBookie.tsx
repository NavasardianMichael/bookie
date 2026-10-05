import { FC } from 'react'
import { useTranslations } from 'next-intl'
import { ROUTES } from '@constants/routes'
import { cn } from '@helpers/cn'
import { AppLink } from '@components/ui/bare/AppLink'
import { AppText } from '@components/ui/bare/AppText'
import { BookieMark } from './BookieMark'

type Props = {
  className?: string
}

/**
 * "Booking page by Bookie — create yours free", under a Free provider's public page. Paid
 * plans remove it (`removeBranding`); the page learns which through the plan-neutral
 * `details.showPoweredBy`, never through the plan.
 *
 * It is an invitation to *other providers* — a visitor who runs a business — so it links to
 * provider registration. antd-free: it renders in the page's server HTML.
 */
export const PoweredByBookie: FC<Props> = ({ className }) => {
  const t = useTranslations('Provider')

  return (
    <p className={cn('m-0 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center', className)}>
      <span className='text-brand inline-flex items-center gap-1.5'>
        <BookieMark size={14} />
        <AppText size='caption' tone='muted'>
          {t('poweredBy')}
        </AppText>
      </span>
      <AppLink href={ROUTES.providerRegistration} className='text-caption'>
        {t('poweredByCta')}
      </AppLink>
    </p>
  )
}
