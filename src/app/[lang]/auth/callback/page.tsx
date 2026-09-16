import { Metadata } from 'next'
import { AuthCard } from '@components/ui/layout'
import { AuthCallbackClient } from './AuthCallbackClient'

export const metadata: Metadata = {
  title: 'Signing you in',
  description: 'Completing sign-in.',
  // A transient hop in the OAuth flow — there is nothing here to index.
  robots: { index: false, follow: false },
}

export default function AuthCallback() {
  return (
    <AuthCard>
      <AuthCallbackClient />
    </AuthCard>
  )
}
