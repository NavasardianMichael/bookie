'use client'

import { FC } from 'react'
import { HEADER_ROUTES } from '@constants/header'
import { ROUTES } from '@constants/routes'
import { cn } from '@helpers/cn'
import AppLink from '@components/ui/bare/AppLink'

type Props = {
  orientation: 'horizontal' | 'vertical'
  isActive: (route: string) => boolean
  onNavigate?: () => void
}

/**
 * The route list, rendered once and shared by the desktop nav and the mobile
 * drawer — previously duplicated verbatim between the two.
 */
const NavLinks: FC<Props> = ({ orientation, isActive, onNavigate }) => {
  const isVertical = orientation === 'vertical'

  return (
    <nav
      aria-label={isVertical ? 'Mobile navigation' : 'Main navigation'}
      className={cn('flex', isVertical ? 'flex-col gap-1' : 'items-center gap-1')}
    >
      {HEADER_ROUTES.map(({ label, name }) => {
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
              'flex min-h-11 items-center rounded-brand px-3 text-body-sm font-medium',
              isVertical && 'min-h-12',
              active
                ? 'bg-brand-50 text-brand active:bg-brand-100'
                : 'text-brand-muted hover:bg-surface-sunken hover:text-brand-text active:bg-surface-sunken'
            )}
          >
            {label}
          </AppLink>
        )
      })}
    </nav>
  )
}

export default NavLinks
