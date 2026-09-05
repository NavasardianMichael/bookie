import { createNavigation } from 'next-intl/navigation'
import { routing } from './routing'

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
 */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing)
