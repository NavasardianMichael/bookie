import { NextResponse } from 'next/server'
import { buildOfflineDocument, buildServiceWorkerScript, PWA_CACHE_NAME } from '@helpers/pwa'
import { BRAND, NEUTRAL } from '@styles/tokens'

/**
 * The service worker script. A Route Handler rather than a file in `public/`, so
 * the offline document can be built from `tokens.ts` instead of duplicating hex.
 *
 * Headers:
 * - `Service-Worker-Allowed: /` — scope is the whole origin, not this folder.
 * - `Cache-Control: no-cache` — the browser must revalidate the script itself.
 *   Registration also sets `updateViaCache: 'none'` as the client-side belt.
 *
 * `/sw.js` has a file extension, so `src/proxy.ts`'s matcher never sees it and
 * it cannot be locale-prefixed.
 */
export const dynamic = 'force-static'

export function GET(): NextResponse {
  const script = buildServiceWorkerScript({
    cacheName: PWA_CACHE_NAME,
    offlineDocument: buildOfflineDocument({
      background: NEUTRAL[0],
      text: BRAND[900],
      muted: NEUTRAL[600],
      brand: BRAND[900],
      onBrand: NEUTRAL[0],
    }),
  })

  return new NextResponse(script, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Service-Worker-Allowed': '/',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  })
}
