import { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'
import { AuthCard } from '@components/ui/layout'
import { ForgotPasswordForm } from './ForgotPasswordForm'

export const metadata: Metadata = {
  title: 'Reset your password',
  description: 'Send a password reset link to your Bookie account email.',
  // The reset funnel is personal and has nothing to rank for.
  robots: { index: false, follow: false },
}

export default async function ForgotPassword({ params }: PageProps<'/[lang]/auth/forgot-password'>) {
  const { lang } = await params
  setRequestLocale(lang)

  return (
    <AuthCard>
      <ForgotPasswordForm />
    </AuthCard>
  )
}
