import { PropsWithChildren } from 'react'
import { PageShell, Surface } from '@components/ui/layout'

/**
 * One narrow, full-height column for the whole sign-on funnel.
 *
 * The white panel matches the prototype registration card. `dvh` inside PageShell
 * keeps the card clear of the iOS URL bar on short phones.
 */
const AuthLayout = ({ children }: PropsWithChildren) => (
  <PageShell variant='fill' width='auth' className='justify-center'>
    <Surface padding='lg' className='flex w-full flex-col gap-6'>
      {children}
    </Surface>
  </PageShell>
)

export default AuthLayout
