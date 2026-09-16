import { Metadata } from 'next'
import { AuthCard } from '@components/ui/layout'
import { ForgotPasswordForm } from './ForgotPasswordForm'

export const metadata: Metadata = {
  title: 'Reset your password',
  description: 'Send a password reset link to your Bookie account email.',
  // The reset funnel is personal and has nothing to rank for.
  robots: { index: false, follow: false },
}

export default function ForgotPassword() {
  return (
    <AuthCard>
      <ForgotPasswordForm />
    </AuthCard>
  )
}
