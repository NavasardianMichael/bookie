'use client'

import { useMemo } from 'react'
import { usePathname } from 'next/navigation'
import { AppRouteName } from '@interfaces/routes'
import { getHeaderConfig, type HeaderConfig } from '@constants/header'
import { isRouteActive, matchRouteName } from '@helpers/routes'

type UseHeaderConfig = HeaderConfig & {
  pathname: string
  routeName?: AppRouteName
  isActive: (route: string) => boolean
}

/**
 * Single source for header state. Header and BackHistoryBtn previously each
 * called `usePathname()` and repeated the same lookup independently.
 */
export const useHeaderConfig = (): UseHeaderConfig => {
  const pathname = usePathname()

  return useMemo(() => {
    const routeName = matchRouteName(pathname)

    return {
      pathname,
      routeName,
      ...getHeaderConfig(routeName),
      isActive: (route: string) => isRouteActive(pathname, route),
    }
  }, [pathname])
}
