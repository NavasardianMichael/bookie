'use client'

import { useMemo } from 'react'
import { AppRouteName } from '@interfaces/routes'
import { usePathname } from '@i18n/navigation'
import { getHeaderConfig, type HeaderConfig } from '@constants/header'
import { isRouteActive, matchRouteName } from '@helpers/routes'

type UseHeaderConfig = HeaderConfig & {
  pathname: string
  routeName?: AppRouteName
  isActive: (route: string) => boolean
}

/** Single source for header chrome: logo, nav, and which destination is active. */
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
