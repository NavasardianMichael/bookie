'use client'

import { CSSProperties, FC, useEffect, useRef, useState } from 'react'
import { Select } from 'antd'
import { useTranslations } from 'next-intl'
import { useRouter } from '@i18n/navigation'
import { USER_TYPES } from '@constants/auth'
import { ROUTE_KEYS, ROUTES } from '@constants/routes'
import { CONSUMER_SETTINGS_NAV, PROVIDER_SETTINGS_NAV } from '@constants/settings'
import { AppAvatar } from '@components/ui/AppAvatar'
import { AppText } from '@components/ui/bare/AppText'

/** Same chevron colour as the header language picker. */
const HEADER_CHEVRON: CSSProperties = { color: 'var(--brand-text-muted)' }

/** Long enough to cross the gap between the control and its portaled popup. */
const CLOSE_DELAY_MS = 150

/** Sidebar label under `Settings.nav`, in the same order as that sidebar. */
type NavLabel =
  | 'profile'
  | 'approvals'
  | 'availability'
  | 'services'
  | 'seo'
  | 'notifications'
  | 'payments'
  | 'analytics'
  | 'advanced'
  | 'payouts'

const NAV_LABEL: Record<string, NavLabel> = {
  [ROUTE_KEYS.providerProfile]: 'profile',
  [ROUTE_KEYS.providerProfileApprovals]: 'approvals',
  [ROUTE_KEYS.providerProfileAvailability]: 'availability',
  [ROUTE_KEYS.providerServices]: 'services',
  [ROUTE_KEYS.providerProfileSeo]: 'seo',
  [ROUTE_KEYS.providerProfileNotifications]: 'notifications',
  [ROUTE_KEYS.providerProfilePayments]: 'payments',
  [ROUTE_KEYS.providerProfileAnalytics]: 'analytics',
  [ROUTE_KEYS.providerProfileAdvanced]: 'advanced',
  [ROUTE_KEYS.providerProfilePayouts]: 'payouts',
  [ROUTE_KEYS.consumerProfile]: 'profile',
  [ROUTE_KEYS.consumerProfileNotifications]: 'notifications',
}

type Destination = {
  value: string
  href: string
  label: string
}

type Props = {
  name: string
  image?: string | null
  /** Providers show the name from `xxl`. Below that the avatar still names the control. */
  showName: boolean
  /** Which settings sidebar this account sees. */
  role: (typeof USER_TYPES)[keyof typeof USER_TYPES]
  isActive: (route: string) => boolean
}

/**
 * The signed-in name and avatar, as the header language picker. Hover opens the same
 * list as that account's settings sidebar — a provider's Profile through Payouts, not
 * the bar's Explore links. The closed control stays the person, not the page name.
 */
export const AccountMenu: FC<Props> = ({ name, image, showName, role, isActive }) => {
  const t = useTranslations('Nav')
  const tNav = useTranslations('Settings.nav')
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cancelClose = () => {
    if (closeTimer.current === null) return
    clearTimeout(closeTimer.current)
    closeTimer.current = null
  }

  const scheduleClose = () => {
    cancelClose()
    closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS)
  }

  useEffect(() => () => cancelClose(), [])

  const entries = role === USER_TYPES.provider ? PROVIDER_SETTINGS_NAV : CONSUMER_SETTINGS_NAV
  const destinations: Destination[] = entries.map(({ route }) => ({
    value: route,
    href: ROUTES[route],
    label: tNav(NAV_LABEL[route]),
  }))

  // Longest match: `/providers/profile` is a prefix of every provider tab.
  const active = destinations
    .filter((item) => isActive(item.href))
    .sort((a, b) => b.href.length - a.href.length)[0]?.value

  return (
    // Popup is portaled into this box, so the pointer can move onto the list. The Select
    // itself owns click and keyboard; this only keeps the hover open across that move.
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      onMouseEnter={() => {
        cancelClose()
        setOpen(true)
      }}
      onMouseLeave={scheduleClose}
    >
      <Select<string>
        aria-label={t('accountSettings')}
        open={open}
        value={active}
        options={destinations.map(({ value, label }) => ({ value, label }))}
        onOpenChange={(next) => {
          if (next) cancelClose()
          setOpen(next)
        }}
        onChange={(next) => {
          const href = destinations.find((item) => item.value === next)?.href
          if (href) router.push(href)
          setOpen(false)
        }}
        variant='borderless'
        popupMatchSelectWidth={false}
        placement='bottomRight'
        getPopupContainer={(node) => node.parentElement ?? document.body}
        // The row highlight is the current path. The trigger itself is the account.
        labelRender={() => ''}
        styles={{ suffix: HEADER_CHEVRON }}
        prefix={
          <span className='inline-flex items-center gap-3'>
            {showName && (
              <AppText as='span' size='body-sm' className='hidden font-semibold xxl:inline'>
                {name}
              </AppText>
            )}
            <AppAvatar src={image ?? undefined} name={name} size={40} />
          </span>
        }
        className='font-semibold'
      />
    </div>
  )
}
