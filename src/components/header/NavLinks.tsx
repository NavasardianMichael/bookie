'use client'

import { FC } from 'react'
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
      // Tighter below `lg`: a signed-in bar carries six destinations and an avatar, which
      // overflowed a 768px viewport at the full gap.
      className={cn('flex', isVertical ? 'flex-col gap-1' : 'items-center gap-5 lg:gap-8')}
    >
      {routes.map((name) => {
        const route = ROUTES[name]
        const active = isActive(route)

        return (
          <AppLink
            key={route}
            href={route}
            variant='plain'
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'text-body-sm font-semibold transition-colors',
              isVertical ? 'flex items-center rounded-brand-sm px-3' : 'inline-flex min-h-11 items-center',
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
            {t(name)}
          </AppLink>
        )
      })}
    </nav>
  )
}
