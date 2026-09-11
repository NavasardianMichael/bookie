import { Metadata } from 'next'
import { AUTH_ERROR_QUERY } from '@constants/auth'
import { AuthCard } from '@components/ui/layout'
import { SignInForm } from './SignInForm'

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to your Bookie account with your email and password, or with Google.',
}

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

/**
 * Sign-in for a returning user. New accounts start at the account-type chooser.
 *
 * The `?error=` the API's Google callback redirects back with is read here rather than in
 * the client island: `next/navigation` is a grep gate, `@i18n/navigation` exposes no
 * `useSearchParams`, and a Server Component already has `searchParams` in hand.
 */
export default async function SignIn({ searchParams }: Props) {
  const params = await searchParams
  const errorParam = params[AUTH_ERROR_QUERY]

  return (
    <AuthCard>
      <SignInForm googleErrorCode={Array.isArray(errorParam) ? errorParam[0] : errorParam} />
    </AuthCard>
  )
}
