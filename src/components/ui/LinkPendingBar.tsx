'use client'

import { FC } from 'react'
import { createPortal } from 'react-dom'
import { useLinkStatus } from 'next/link'

/**
 * The thin progress bar across the top of the window while a click waits on the server.
 *
 * Every `[lang]` route renders per request, so Next prefetches a route only down to its
 * `loading.tsx` — and a route without one (the provider page, the legal pages, `/auth/*`)
 * not at all. Clicking such a link used to change nothing on screen until the whole render
 * arrived. `AppLink` renders this inside each internal link; `useLinkStatus` is `pending`
 * from the click until the URL commits, and stays `false` when the destination was already
 * prefetched, so an instant navigation never shows it.
 *
 * Portalled to `<body>`: rendered in place it would inherit the anchor's stacking context
 * and any transformed ancestor would break `position: fixed`. Only the most recent click is
 * ever pending, so two bars never stack. The `animate-nav-progress` keyframes start after a
 * short delay, which keeps a fast server answer from flashing it.
 */
export const LinkPendingBar: FC = () => {
  const { pending } = useLinkStatus()

  if (!pending) return null

  return createPortal(
    <div
      aria-hidden
      className='bg-brand animate-nav-progress pointer-events-none fixed inset-x-0 top-0 z-60 h-0.75 ltr:origin-left rtl:origin-right'
    />,
    document.body,
  )
}
