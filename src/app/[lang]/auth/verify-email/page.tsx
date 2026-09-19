import { Metadata } from 'next'
import { EMAIL_VERIFY_QUERY } from '@constants/auth'
import { AuthCard } from '@components/ui/layout'
import { VerifyEmailClient } from './VerifyEmailClient'

export const metadata: Metadata = {
  title: 'Verify your email',
  description: 'Confirm the email address on your Bookie account.',
  // Carries a one-time token in the query string; it must never be indexed.
  robots: { index: false, follow: false },
}

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function VerifyEmail({ searchParams }: Props) {
  const params = await searchParams
  // `EMAIL_VERIFY_QUERY`, not `TOKEN_QUERY`: this page has exactly one producer —
  // `buildEmailVerifyUrl` on the server — and that is the name it mints. Reading the
  // password-reset spelling here made every emailed link land tokenless, which this page
  // reports as an expired link rather than as the mismatch it was.
  const token = params[EMAIL_VERIFY_QUERY]

  return (
    <AuthCard>
      <VerifyEmailClient token={Array.isArray(token) ? token[0] : token} />
    </AuthCard>
  )
}
