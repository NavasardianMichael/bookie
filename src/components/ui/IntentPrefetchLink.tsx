'use client'

import { ComponentProps, FC, FocusEvent, MouseEvent, TouchEvent, useState } from 'react'
import NextLink from 'next/link'

type Props = ComponentProps<typeof NextLink>

/**
 * `next/link` for the public provider page, `/p/<key>` — the one locale-free route, and the
 * most-clicked one (every Explore card, category and organization list).
 *
 * The page is dynamic and deliberately has no `loading.tsx` (`src/app/CLAUDE.md`), so Next's
 * default prefetch skips it and a click waits for the full render. Prefetching every card in
 * the viewport instead would cost a server render per card. This fetches the **full** route
 * (`prefetch={true}`) only once the visitor shows intent — pointer over, keyboard focus, or
 * the start of a tap — which wins most of the hover-to-click gap on a desktop and the
 * touch-to-click gap on a phone. An explicit `prefetch` from the caller is kept as given.
 */
export const IntentPrefetchLink: FC<Props> = ({ prefetch, onMouseEnter, onFocus, onTouchStart, ...props }) => {
  const [intent, setIntent] = useState(false)

  return (
    <NextLink
      {...props}
      prefetch={prefetch ?? intent}
      onMouseEnter={(event: MouseEvent<HTMLAnchorElement>) => {
        setIntent(true)
        onMouseEnter?.(event)
      }}
      onFocus={(event: FocusEvent<HTMLAnchorElement>) => {
        setIntent(true)
        onFocus?.(event)
      }}
      onTouchStart={(event: TouchEvent<HTMLAnchorElement>) => {
        setIntent(true)
        onTouchStart?.(event)
      }}
    />
  )
}
