import { useMemo } from 'react'
import { createNavigation } from 'next-intl/navigation'
import { blockClientNavigation } from '@helpers/unsavedChangesGuard'
import { DEFAULT_LOCALE, isLocale } from './config'
import { routing } from './routing'

const navigation = createNavigation(routing)

/**
 * Locale-aware replacements for `next/link` and `next/navigation`.
 *
 * **Use these, never the `next/*` originals**, for any internal destination.
 * They add the active locale prefix on the way out and strip it on the way back,
 * which is what keeps `ROUTES` free of locale segments and lets
 * `matchRouteName` / `isRouteActive` (`src/helpers/routes.ts`) keep matching the
 * bare paths their tests pin.
 *
 * `Link` is wired into `AppLink` (`@components/ui/bare/AppLink`), the single
 * anchor primitive, so most call sites get this for free.
 *
 * `push` / `replace` ask the browser before leaving a page with unsaved form
 * edits (`src/helpers/unsavedChangesGuard.ts`). A clean page navigates as before.
 */
export const { Link, redirect, usePathname, getPathname } = navigation

const localeFromLocation = () => {
  if (typeof window === 'undefined') return DEFAULT_LOCALE
  const segment = window.location.pathname.split('/').filter(Boolean)[0] ?? ''
  return isLocale(segment) ? segment : DEFAULT_LOCALE
}

export const useRouter = () => {
  const router = navigation.useRouter()

  return useMemo(() => {
    const leave = (
      href: Parameters<typeof router.push>[0],
      options: Parameters<typeof router.push>[1],
      mode: 'assign' | 'replace',
      run: () => void
    ) => {
      const locale = options?.locale ?? localeFromLocation()
      const path = getPathname({ href, locale })
      if (!blockClientNavigation(path, mode)) run()
    }

    return {
      ...router,
      push: (href: Parameters<typeof router.push>[0], options?: Parameters<typeof router.push>[1]) => {
        leave(href, options, 'assign', () => router.push(href, options))
      },
      replace: (href: Parameters<typeof router.replace>[0], options?: Parameters<typeof router.replace>[1]) => {
        leave(href, options, 'replace', () => router.replace(href, options))
      },
    }
  }, [router])
}
