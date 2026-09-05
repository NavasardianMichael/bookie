import { FC, PropsWithChildren } from 'react'
import { cn } from '@helpers/cn'
import { PageShell } from './PageShell'
import { Surface } from './Surface'

export type AuthCardProps = PropsWithChildren<{
  className?: string
}>

/**
 * One narrow, full-height white card — the shape every step of the sign-on funnel takes,
 * and the prototype's provider registration card at its native 480px
 * (`--container-auth-content`).
 *
 * This used to live in `app/auth/layout.tsx`, but Next nested layouts compose rather than
 * replace, so a child route could never opt out of it. The consumer registration screen is
 * a full-bleed two-column split with no card at all, so the card had to become something a
 * page opts into instead of something the segment imposes.
 */
export const AuthCard: FC<AuthCardProps> = ({ className, children }) => (
  <PageShell variant='fill' width='auth' className='justify-center'>
    <Surface padding='lg' className={cn('flex w-full flex-col gap-6', className)}>
      {children}
    </Surface>
  </PageShell>
)
