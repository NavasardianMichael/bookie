import { Metadata } from 'next'
import { TOKEN_QUERY } from '@constants/auth'
import { AuthCard } from '@components/ui/layout'
import { ResetPasswordForm } from './ResetPasswordForm'

export const metadata: Metadata = {
  title: 'Choose a new password',
  description: 'Set a new password for your Bookie account.',
  // Carries a one-time credential in the query string; it must never be indexed.
  robots: { index: false, follow: false },
}

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function ResetPassword({ searchParams }: Props) {
  const params = await searchParams
  const token = params[TOKEN_QUERY]

  return (
    <AuthCard>
      <ResetPasswordForm token={Array.isArray(token) ? token[0] : token} />
    </AuthCard>
  )
}
