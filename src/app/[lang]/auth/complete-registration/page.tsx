import { Metadata } from 'next'
import { AuthCard } from '@components/ui/layout'
import { CompleteRegistrationForm } from './CompleteRegistrationForm'

export const metadata: Metadata = {
  title: 'Finish setting up',
  description: 'Tell us how you will use Bookie and how a provider can reach you.',
  // Reachable only mid-flow, holding a pending Google identity in a cookie.
  robots: { index: false, follow: false },
}

export default function CompleteRegistration() {
  return (
    <AuthCard>
      <CompleteRegistrationForm />
    </AuthCard>
  )
}
