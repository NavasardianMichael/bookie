'use client'

import { FC, Fragment, ReactNode, useEffect, useMemo, useState } from 'react'
import { ControlOutlined, DollarOutlined } from '@ant-design/icons'
import { App, Badge } from 'antd'
import { useTranslations } from 'next-intl'
import { dismissProfileAssistantAPI, getProfileAssistantStatusAPI } from '@api/profileAssistant/main'
import { ProfileAssistantStatus } from '@api/profileAssistant/types'
import { useAuthStore } from '@store/auth/store'
import { useProviderApprovalsStore } from '@store/providers/approvals/store'
import { ROUTE_KEYS } from '@constants/routes'
import { PROVIDER_SETTINGS_NAV, toSettingsNavItems } from '@constants/settings'
import { reportError } from '@helpers/reportError'
import { ProfileAssistantButton } from '@components/profileAssistant/ProfileAssistantButton'
import { ProfileAssistantSheet } from '@components/profileAssistant/ProfileAssistantSheet'
import { AccountSettingsLayout } from '@components/settings/AccountSettingsLayout'
import {
  BellIcon,
  ChartIcon,
  CheckCircleIcon,
  ClockIcon,
  CreditCardIcon,
  GlobeIcon,
  ListIcon,
  UserIcon,
} from '@components/ui/icons'

type Props = {
  children: ReactNode
}

export const ProviderSettingsLayoutClient: FC<Props> = ({ children }) => {
  const t = useTranslations('Settings')
  const pendingApprovals = useProviderApprovalsStore.use.count()
  const getPendingApprovalsCount = useProviderApprovalsStore.use.getPendingApprovalsCount()
  const getMe = useAuthStore.use.getMe()
  const { message } = App.useApp()
  const [assistantStatus, setAssistantStatus] = useState<ProfileAssistantStatus | null>(null)
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [assistantRevision, setAssistantRevision] = useState(0)

  /**
   * Counted once for the whole account area, because the badge is on the sidebar and
   * the sidebar is on every tab — a provider who is on Analytics still needs to see
   * that three bookings are waiting.
   *
   * Only the mount: the Approvals panel re-reads it through the same store after each
   * decision, so there is nothing to poll for. A swallowed rejection is deliberate —
   * the store leaves the last count standing, and a sidebar is not a place a failed
   * fetch can be acted on.
   */
  useEffect(() => {
    // A badge is decoration: a failed count leaves the last one (or none) and is recorded,
    // not announced — the Approvals tab itself shows the real queue and its errors.
    void getPendingApprovalsCount().catch((error: unknown) => reportError(error, 'ProviderSettingsLayout:approvalsBadge'))
  }, [getPendingApprovalsCount])

  /**
   * The profile assistant opens by itself once, for a provider who has never closed or applied
   * it — a new account's first look at an empty workspace. Read once for the whole area, like
   * the badge; a failed read only means it does not open by itself, so it is recorded, not shown.
   */
  useEffect(() => {
    let cancelled = false
    void getProfileAssistantStatusAPI()
      .then((status) => {
        if (cancelled) return
        setAssistantStatus(status)
        if (status.pending && status.available) setAssistantOpen(true)
      })
      .catch((error: unknown) => reportError(error, 'ProviderSettingsLayout:assistantStatus'))
    return () => {
      cancelled = true
    }
  }, [])

  /** Closed without applying: it stops opening by itself. The button still opens it. */
  const closeAssistant = (): void => {
    setAssistantOpen(false)
    if (!assistantStatus?.pending) return
    setAssistantStatus({ ...assistantStatus, pending: false })
    void dismissProfileAssistantAPI().catch((error: unknown) => reportError(error, 'ProviderSettingsLayout:assistantDismiss'))
  }

  const handleAssistantApplied = (): void => {
    setAssistantOpen(false)
    if (assistantStatus) setAssistantStatus({ ...assistantStatus, pending: false })
    setAssistantRevision((revision) => revision + 1)
    void message.success(t('assistant.applied'))
    // The header shows the name, and the workspace prints times on the published clock.
    void getMe()
  }

  const items = useMemo(
    () =>
      toSettingsNavItems(
        PROVIDER_SETTINGS_NAV,
        {
          [ROUTE_KEYS.providerProfile]: t('nav.profile'),
          /**
           * antd `Badge` composed here rather than inside `SettingsShell`, which is
           * antd-free by contract (`src/components/CLAUDE.md`). This file is already a
           * client island, so the runtime it pulls in is one it was paying for anyway.
           *
           * `count={0}` renders nothing — antd hides a zero badge unless `showZero` —
           * so "no pending approvals" needs no branch here.
           */
          [ROUTE_KEYS.providerProfileApprovals]: (
            <Badge
              count={pendingApprovals}
              // Nudged clear of the label's top-right corner; without it the bubble
              // overlaps the final glyph rather than sitting above it.
              offset={[10, -2]}
              // A cap, not a ceiling on the truth: the queue itself is paged and shows
              // the real total. Anything past this is "a lot", which is the only thing
              // a sidebar bubble can usefully say.
              overflowCount={99}
              title={t('approvals.badgeTitle', { count: pendingApprovals })}
            >
              {t('nav.approvals')}
            </Badge>
          ),
          [ROUTE_KEYS.providerProfileAnalytics]: t('nav.analytics'),
          [ROUTE_KEYS.providerProfileAvailability]: t('nav.availability'),
          [ROUTE_KEYS.providerServices]: t('nav.services'),
          [ROUTE_KEYS.providerProfileSeo]: t('nav.seo'),
          [ROUTE_KEYS.providerProfileNotifications]: t('nav.notifications'),
          [ROUTE_KEYS.providerProfilePayments]: t('nav.payments'),
          [ROUTE_KEYS.providerProfileAdvanced]: t('nav.advanced'),
          [ROUTE_KEYS.providerProfilePayouts]: t('nav.payouts'),
        },
        {
          [ROUTE_KEYS.providerProfile]: <UserIcon className='h-5 w-5' />,
          [ROUTE_KEYS.providerProfileApprovals]: <CheckCircleIcon className='h-5 w-5' />,
          [ROUTE_KEYS.providerProfileAnalytics]: <ChartIcon className='h-5 w-5' />,
          [ROUTE_KEYS.providerProfileAvailability]: <ClockIcon className='h-5 w-5' />,
          [ROUTE_KEYS.providerServices]: <ListIcon className='h-5 w-5' />,
          [ROUTE_KEYS.providerProfileSeo]: <GlobeIcon className='h-5 w-5' />,
          [ROUTE_KEYS.providerProfileNotifications]: <BellIcon className='h-5 w-5' />,
          [ROUTE_KEYS.providerProfilePayments]: <CreditCardIcon className='h-5 w-5' />,
          // antd, not `ui/icons.tsx`: a new glyph on a client island (src/components/CLAUDE.md).
          [ROUTE_KEYS.providerProfileAdvanced]: <ControlOutlined className='text-xl' />,
          [ROUTE_KEYS.providerProfilePayouts]: <DollarOutlined className='text-xl' />,
        }
      ),
    [pendingApprovals, t]
  )

  return (
    <>
      <AccountSettingsLayout
        accountRole='provider'
        items={items}
        title={t('settings')}
        subtitle={t('providerSubtitle')}
        headerAction={<ProfileAssistantButton onClick={() => setAssistantOpen(true)} />}
      >
        {/* Re-keyed after the assistant applies, so the open tab re-reads what it just wrote. */}
        <Fragment key={assistantRevision}>{children}</Fragment>
      </AccountSettingsLayout>
      <ProfileAssistantSheet
        open={assistantOpen}
        onClose={closeAssistant}
        onApplied={handleAssistantApplied}
        dailyLimit={assistantStatus?.runsPerDay ?? null}
      />
    </>
  )
}
