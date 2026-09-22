'use client'

import { FC } from 'react'
import { useTranslations } from 'next-intl'
import { ROUTES } from '@constants/routes'
import { cn } from '@helpers/cn'
import { AppLink } from '@components/ui/bare/AppLink'

type Props = {
  /**
   * The sentence opener, which differs per prototype — the consumer screen says "By signing
   * up", the provider screen names the button it sits under.
   */
  lead: string
  className?: string
}

/**
 * Terms and privacy consent, passive by design: both prototypes state it as text under the
 * submit button, with no checkbox to tick.
 */
export const TermsNotice: FC<Props> = ({ lead, className }) => {
  const t = useTranslations('Auth')
  const tLegal = useTranslations('Legal')

  return (
    <p className={cn('text-caption text-brand-muted text-center leading-relaxed', className)}>
      {lead} <AppLink href={ROUTES.terms}>{tLegal('termsTitle')}</AppLink> {t('termsAnd')}{' '}
      <AppLink href={ROUTES.privacy}>{tLegal('privacyTitle')}</AppLink>.
    </p>
  )
}
