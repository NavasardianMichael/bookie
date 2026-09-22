'use client'

import { FC, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useAuthStore } from '@store/auth/store'
import { usePathname, useRouter } from '@i18n/navigation'
import { USER_TYPES } from '@constants/auth'
import { ROUTES } from '@constants/routes'
import { cn } from '@helpers/cn'
import { workspaceOf } from '@helpers/workspace'
import { AppConfirmModal } from '@components/ui/AppConfirmModal'
import { LogoutIcon } from '@components/ui/icons'
import { SettingsNavItem, SettingsShell } from '@components/ui/layout/SettingsShell'
import { WorkspaceSwitch } from './WorkspaceSwitch'

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
  const profiles = useAuthStore.use.profiles()
  const getMe = useAuthStore.use.getMe()
  const logout = useAuthStore.use.logout()
  const isSignedOn = useAuthStore.use.isSignedOn()
  const [signOutOpen, setSignOutOpen] = useState(false)

  /**
   * Which tree is on screen, read from the URL rather than from `accountRole`.
   *
   * They agree today — each layout passes its own role — but the URL is what the switch
   * has to reverse, so taking it from the same place the destination is computed from
   * keeps the control and its target from ever disagreeing.
   */
  const currentWorkspace = workspaceOf(pathname)
  const showSwitch = Boolean(profiles?.consumer && profiles?.provider)

  /**
   * Signed out goes to sign-in. A role mismatch used to go to the caller's own tree
   * unconditionally — which is what made the two halves mutually exclusive, and what
   * made a provider's own consumer record unreachable the moment booking created it.
   *
   * Now the bounce fires only when the account genuinely does **not** hold this side.
   * A provider who holds a Consumer profile is not lost on `/consumers/profile`; they
   * are looking at their own record, and the API scopes it to their `userId` rather
   * than to the role their session happens to carry.
   *
   * `profiles` is absent on a payload from before this shipped, so it falls back to the
   * session role — the old behaviour — rather than letting an unknown through.
   */
  useEffect(() => {
    let cancelled = false

    const guard = async () => {
      const session = isSignedOn && userType ? { role: userType, profiles } : await getMe()
      if (cancelled) return
      if (!session) {
        replace(ROUTES.signIn)
        return
      }
      const holdsThisSide = session.profiles?.[accountRole] ?? session.role === accountRole
      if (!holdsThisSide) {
        replace(session.role === USER_TYPES.provider ? ROUTES.providerProfile : ROUTES.consumerProfile)
      }
    }

    void guard()
    return () => {
      cancelled = true
    }
  }, [accountRole, getMe, isSignedOn, profiles, replace, userType])

  const onConfirmSignOut = async () => {
    await logout()
    push(ROUTES.home)
  }

  return (
    <>
      <SettingsShell
        title={title}
        subtitle={subtitle}
        accountLabel={accountLabel}
        displayName={displayName}
        items={items}
        activeHref={pathname}
        contentHeader={
          // Offered only when the account holds both profiles — otherwise the
          // destination is a record that does not exist.
          showSwitch && currentWorkspace ? (
            <WorkspaceSwitch current={currentWorkspace} pathname={pathname} />
          ) : undefined
        }
        footer={
          <button
            type='button'
            onClick={() => setSignOutOpen(true)}
            className={cn(
              'text-brand-muted hover:text-brand-danger flex w-full cursor-pointer items-center gap-3 px-3 py-2.5 text-body-sm font-medium transition-colors'
            )}
          >
            <LogoutIcon className='h-5 w-5' />
            {t('signOut')}
          </button>
        }
      >
        {children}
      </SettingsShell>
      <AppConfirmModal
        title={t('signOutTitle')}
        description={t('signOutBody')}
        okText={t('signOut')}
        open={signOutOpen}
        onConfirm={onConfirmSignOut}
        onCancel={() => setSignOutOpen(false)}
      />
    </>
  )
}
