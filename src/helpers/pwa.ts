export const SERVICE_WORKER_URL = '/sw.js'

/** Bump when the offline document or the worker's behaviour changes. */
export const PWA_CACHE_NAME = 'bookie-shell-v1'

const OFFLINE_URL = '/__bookie-offline__'

export type PwaShellColors = {
  background: string
  text: string
  muted: string
  brand: string
  onBrand: string
}

/**
 * Minimal offline document the service worker serves when a navigation fails.
 *
 * Lives here rather than as a route: an `[lang]/offline` page is unreachable
 * once the network is gone unless every locale variant was precached, and
 * precaching HTML in a booking app would freeze stale availability. This
 * document is inlined into the worker at generation time, so it is always
 * there. English-only, same as `global-error.tsx` — both are last-resort UI
 * outside the catalogue.
 *
 * `<a href="">` retries the failed URL without inline script (the document is
 * served *as* that URL's response, so an empty href reloads it).
 */
export const buildOfflineDocument = (colors: PwaShellColors): string => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="${colors.brand}" />
    <title>Bookie</title>
    <style>
      html, body { margin: 0; }
      body {
        min-height: 100dvh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1.5rem;
        background: ${colors.background};
        color: ${colors.text};
        font-family: system-ui, -apple-system, sans-serif;
        text-align: center;
      }
      main { display: flex; flex-direction: column; gap: 0.75rem; max-width: 32rem; }
      h1 { margin: 0; font-size: 1.5rem; }
      p { margin: 0; color: ${colors.muted}; }
      a {
        align-self: center;
        margin-top: 0.5rem;
        min-height: 2.75rem;
        padding: 0 1.25rem;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 0.5rem;
        background: ${colors.brand};
        color: ${colors.onBrand};
        font-size: 1rem;
        font-weight: 600;
        text-decoration: none;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>You're offline</h1>
      <p>Bookie needs a connection to show live availability and bookings.</p>
      <a href="">Try again</a>
    </main>
  </body>
</html>
`

/**
 * Network-only service worker: navigations go to the network, everything else
 * is left alone (the browser HTTP cache already handles hashed `/_next/static`
 * assets). Failed navigations get `offlineDocument`.
 *
 * Booking pages and the API must never be cached here — a stale slot list is
 * worse than an offline screen. Values are JSON-stringified so a quote in the
 * HTML cannot break out of the generated script.
 */
export const buildServiceWorkerScript = (options: { cacheName: string; offlineDocument: string }): string => {
  const cacheName = JSON.stringify(options.cacheName)
  const offlineUrl = JSON.stringify(OFFLINE_URL)
  const offlineHtml = JSON.stringify(options.offlineDocument)

  return `'use strict';
const CACHE = ${cacheName};
const OFFLINE_URL = ${offlineUrl};
const OFFLINE_HTML = ${offlineHtml};

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.put(
      OFFLINE_URL,
      new Response(OFFLINE_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
    );
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  if (request.mode !== 'navigate') return;

  event.respondWith((async () => {
    try {
      return await fetch(request);
    } catch {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(OFFLINE_URL);
      return (
        cached ||
        new Response(OFFLINE_HTML, {
          status: 503,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        })
      );
    }
  })());
});
`
}
