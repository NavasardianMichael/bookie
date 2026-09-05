import { FC } from 'react'
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
export const TermsNotice: FC<Props> = ({ lead, className }) => (
  <p className={cn('text-caption text-brand-muted text-center leading-relaxed', className)}>
    {lead} <AppLink href={ROUTES.terms}>Terms of Service</AppLink> and{' '}
    <AppLink href={ROUTES.privacy}>Privacy Policy</AppLink>.
  </p>
)
