import { Metadata } from 'next'
import { TOKEN_QUERY } from '@constants/auth'
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
  const token = params[TOKEN_QUERY]

  return (
    <AuthCard>
      <VerifyEmailClient token={Array.isArray(token) ? token[0] : token} />
    </AuthCard>
  )
}
