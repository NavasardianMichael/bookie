'use client'

import { useMemo } from 'react'
import { useRouter as useNextRouter } from 'next/navigation'
import { createNavigation } from 'next-intl/navigation'
import { blockClientNavigation } from '@helpers/unsavedChangesGuard'
import { DEFAULT_LOCALE, isLocale } from './config'
import { isLocaleFreePath } from './pathname'
import { routing } from './routing'

/**
 * `useRouter` for `@i18n/navigation`, which re-exports it — import it from there.
 *
 * A module of its own, marked `'use client'`, because it reads Next's own router as well,
 * and `next/navigation`'s `useRouter` may not be imported into a module a Server Component
 * also loads (`@i18n/navigation` is: it carries `Link`). Re-exported, it reaches the server
 * graph only as a client reference.
 */
const navigation = createNavigation(routing)

const localeFromLocation = () => {
  if (typeof window === 'undefined') return DEFAULT_LOCALE
  const segment = window.location.pathname.split('/').filter(Boolean)[0] ?? ''
  return isLocale(segment) ? segment : DEFAULT_LOCALE
}

/**
 * next-intl's router, with two additions:
 *
 * - `push` / `replace` ask the browser before leaving a page with unsaved form edits
 *   (`src/helpers/unsavedChangesGuard.ts`). A clean page navigates as before.
 * - The public provider page (`/p/<key>`, `isLocaleFreePath`) goes through Next's own router:
 *   next-intl's would prefix a locale the page does not have, and the proxy would answer that
 *   with a 308 back to the bare URL.
 */
export const useRouter = () => {
  const router = navigation.useRouter()
  const nextRouter = useNextRouter()

  return useMemo(() => {
    const leave = (
      href: Parameters<typeof router.push>[0],
      options: Parameters<typeof router.push>[1],
      mode: 'assign' | 'replace',
      run: () => void
    ) => {
      const locale = options?.locale ?? localeFromLocation()
      const path = navigation.getPathname({ href, locale })
      if (!blockClientNavigation(path, mode)) run()
    }

    return {
      ...router,
      push: (href: Parameters<typeof router.push>[0], options?: Parameters<typeof router.push>[1]) => {
        if (typeof href === 'string' && isLocaleFreePath(href)) {
          if (!blockClientNavigation(href, 'assign')) nextRouter.push(href, { scroll: options?.scroll })
          return
        }
        leave(href, options, 'assign', () => router.push(href, options))
      },
      replace: (href: Parameters<typeof router.replace>[0], options?: Parameters<typeof router.replace>[1]) => {
        if (typeof href === 'string' && isLocaleFreePath(href)) {
          if (!blockClientNavigation(href, 'replace')) nextRouter.replace(href, { scroll: options?.scroll })
          return
        }
        leave(href, options, 'replace', () => router.replace(href, options))
      },
    }
  }, [nextRouter, router])
}
