'use client'

import { FC, useEffect, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { useAuthStore } from '@store/auth/store'
import { usePathname, useRouter } from '@i18n/navigation'
import { USER_TYPES } from '@constants/auth'
import { ROUTES } from '@constants/routes'
import { cn } from '@helpers/cn'
import { LogoutIcon } from '@components/ui/icons'
import { SettingsNavItem, SettingsShell } from '@components/ui/layout/SettingsShell'

type Props = {
  accountRole: 'consumer' | 'provider'
  items: SettingsNavItem[]
  title: string
  subtitle?: string
  accountLabel?: string
  displayName?: string
  children: React.ReactNode
}

/**
 * Client wrapper around SettingsShell: resolves the active path and wires Sign Out.
 * Role mismatch redirects to the caller's own settings home.
 */
export const AccountSettingsLayout: FC<Props> = ({
  accountRole,
  items,
  title,
  subtitle,
  accountLabel,
  displayName,
  children,
}) => {
  const t = useTranslations('Settings')
  const pathname = usePathname()
  const { replace, push } = useRouter()
  const userType = useAuthStore.use.userType()
  const getMe = useAuthStore.use.getMe()
  const logout = useAuthStore.use.logout()
  const isSignedOn = useAuthStore.use.isSignedOn()
  const [isLoggingOut, startLogout] = useTransition()

  useEffect(() => {
    let cancelled = false

    const guard = async () => {
      const session = isSignedOn && userType ? { role: userType } : await getMe()
      if (cancelled) return
      if (!session) {
        replace(ROUTES.phoneNumberInput)
        return
      }
      if (session.role !== accountRole) {
        replace(session.role === USER_TYPES.provider ? ROUTES.providerProfile : ROUTES.consumerProfile)
      }
    }

    void guard()
    return () => {
      cancelled = true
    }
  }, [accountRole, getMe, isSignedOn, replace, userType])

  const handleSignOut = () => {
    startLogout(async () => {
      await logout()
      push(ROUTES.home)
    })
  }

  return (
    <SettingsShell
      title={title}
      subtitle={subtitle}
      accountLabel={accountLabel}
      displayName={displayName}
      items={items}
      activeHref={pathname}
      footer={
        <button
          type='button'
          onClick={handleSignOut}
          disabled={isLoggingOut}
          className={cn(
            'text-brand-muted hover:text-brand-danger flex w-full items-center gap-3 px-3 py-2.5 text-body-sm font-medium transition-colors',
            isLoggingOut && 'opacity-60'
          )}
        >
          <LogoutIcon className='h-5 w-5' />
          {t('signOut')}
        </button>
      }
    >
      {children}
    </SettingsShell>
  )
}
