'use client'

import { FC, useEffect } from 'react'
import { processError } from '@helpers/error'
import { SERVICE_WORKER_URL } from '@helpers/pwa'

/**
 * Registers the app-scoped service worker in production.
 *
 * Skipped in `next dev`: a worker that intercepts navigations fights Turbopack
 * HMR and is the classic "I changed the code and nothing moved" trap. Local
 * installability is verified with `pnpm build && pnpm start`.
 *
 * `updateViaCache: 'none'` stops the browser HTTP-caching `/sw.js` itself.
 * Checking `registration.update()` on visibilitychange is how a standalone
 * window that stays open for days still picks up a newly deployed worker.
 *
 * A failed registration is logged, not toasted — the site works without a
 * worker; installability and the offline shell are the only things lost.
 */
export const ServiceWorkerRegistrar: FC = () => {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (!('serviceWorker' in navigator)) return

    let registration: ServiceWorkerRegistration | undefined

    void navigator.serviceWorker
      .register(SERVICE_WORKER_URL, { scope: '/', updateViaCache: 'none' })
      .then((next) => {
        registration = next
      })
      .catch((error: unknown) => {
        console.error(processError(error).message)
      })

    const onVisible = () => {
      if (document.visibilityState === 'visible') void registration?.update()
    }

    document.addEventListener('visibilitychange', onVisible)

    return () => {
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  return null
}
