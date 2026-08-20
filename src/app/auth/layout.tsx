import { PropsWithChildren } from 'react'
import { PageShell } from '@components/ui/layout'

/**
 * One narrow, full-height column for the whole sign-on funnel.
 *
 * `justify-between` on phones puts the primary action at the thumb line;
 * `md:justify-center` centres the card on larger screens. `dvh` inside PageShell
 * keeps the CTA clear of the iOS URL bar.
 */
const AuthLayout = ({ children }: PropsWithChildren) => (
  <PageShell variant='fill' width='auth' className='justify-between gap-6 md:justify-center'>
    {children}
  </PageShell>
)

export default AuthLayout
