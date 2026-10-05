import { useSyncExternalStore } from 'react'
import { getRuntimeTimeZone } from '@helpers/timeZone'

/** The zone does not change under a mounted page, so there is nothing to subscribe to. */
const subscribe = (): (() => void) => () => {}

const getServerSnapshot = (): undefined => undefined

/**
 * The visitor's own IANA zone — `undefined` during SSR and the hydrating render, the
 * browser's zone from then on.
 *
 * Read during render it would be the *server's* zone on the server and the visitor's on the
 * client, and React would throw the server's label away with a hydration error. The server
 * snapshot keeps both first renders identical; React re-renders with the real value straight
 * after, without an effect or a second state.
 */
export const useViewerTimeZone = (): string | undefined =>
  useSyncExternalStore(subscribe, getRuntimeTimeZone, getServerSnapshot)
