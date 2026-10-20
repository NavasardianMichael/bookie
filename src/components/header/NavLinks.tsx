'use client'

import { FC, ReactNode } from 'react'
import { AppstoreOutlined, BankOutlined, CalendarOutlined, DollarOutlined, HeartOutlined, TeamOutlined } from '@ant-design/icons'
import { useTranslations } from 'next-intl'
import { AppRouteName } from '@interfaces/routes'
import { ROUTES } from '@constants/routes'
import { cn } from '@helpers/cn'
import { AppLink } from '@components/ui/bare/AppLink'

type Props = {
  routes: AppRouteName[]
  orientation: 'horizontal' | 'vertical'
  isActive: (route: string) => boolean
  onNavigate?: () => void
}

const NAV_ICONS: Partial<Record<AppRouteName, ReactNode>> = {
  providers: <TeamOutlined aria-hidden />,
  categories: <AppstoreOutlined aria-hidden />,
  organizations: <BankOutlined aria-hidden />,
  pricing: <DollarOutlined aria-hidden />,
  bookings: <CalendarOutlined aria-hidden />,
  favorites: <HeartOutlined aria-hidden />,
}

/**
 * The route list, rendered once and shared by the desktop nav and the mobile
 * drawer — previously duplicated verbatim between the two.
 */
export const NavLinks: FC<Props> = ({ routes, orientation, isActive, onNavigate }) => {
  const t = useTranslations('Nav')
  const isVertical = orientation === 'vertical'

  if (!routes.length) return null

  return (
    <nav
      aria-label={isVertical ? t('mobileNavigation') : t('mainNavigation')}
      // Wider gaps only from `xxl`. Below that the signed-in bar (six destinations,
      // language, avatar) is already flush with the viewport in the longer locales.
      className={cn(
        'flex',
        isVertical ? 'flex-col divide-y divide-brand-border' : 'items-center gap-4 xxl:gap-6'
      )}
    >
      {routes.map((name) => {
        const route = ROUTES[name]
        const active = isActive(route)
        const icon = NAV_ICONS[name]

        return (
          <AppLink
            key={route}
            href={route}
            variant='plain'
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'text-sm font-semibold transition-colors',
              isVertical
                ? 'flex items-center gap-2 rounded-brand-sm px-3 py-3'
                : 'inline-flex min-h-11 items-center gap-1.5',
              active
                ? isVertical
                  ? 'bg-brand-50 text-brand'
                  : 'text-brand underline decoration-2 underline-offset-4'
                : cn(
                    'text-brand-text hover:text-brand',
                    isVertical && 'hover:bg-surface-sunken active:bg-surface-sunken'
                  )
            )}
          >
            {/* Icons only from `xxl`: labels alone are what fit between `xl` and `xxl`. */}
            {icon ? <span className={cn(!isVertical && 'hidden xxl:inline-flex')}>{icon}</span> : null}
            {t(name)}
          </AppLink>
        )
      })}
    </nav>
  )
}
