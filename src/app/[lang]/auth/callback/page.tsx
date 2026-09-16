import { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'
import { AuthCard } from '@components/ui/layout'
import { AuthCallbackClient } from './AuthCallbackClient'

export const metadata: Metadata = {
  title: 'Signing you in',
  description: 'Completing sign-in.',
  // A transient hop in the OAuth flow — there is nothing here to index.
  robots: { index: false, follow: false },
}

export default async function AuthCallback({ params }: PageProps<'/[lang]/auth/callback'>) {
  const { lang } = await params
  setRequestLocale(lang)

  return (
    <AuthCard>
      <AuthCallbackClient />
    </AuthCard>
  )
}
