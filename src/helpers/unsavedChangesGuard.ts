import { isSamePageUrl } from '@helpers/unsavedChanges'

/**
 * Leave-page guard for a form the user has edited and not saved.
 *
 * Closing the tab, refreshing, and following a link all ask with the browser's own
 * dialog (`beforeunload`). Client-side navigations do not unload the document, so
 * they would skip that dialog — those are turned into a real navigation
 * (`location.assign`) while the form is dirty, which is what makes the browser ask.
 * Cancelling the dialog stays on the page.
 *
 * `setFieldsValue` does not count as an edit. Only a reader a form registered, which
 * settings flip from their existing dirty flag and other forms flip from
 * `onValuesChange` (user edits only — rc-form does not call it for `setFieldsValue`).
 */

type LeaveMode = 'assign' | 'replace'

const readers = new Set<() => boolean>()

let suppressed = false

const here: { href: string; state: unknown } = { href: '', state: null }

const INSTALLED = '__bookieUnsavedChangesGuard'

export const hasUnsavedChanges = (): boolean => {
  if (suppressed) return false
  for (const read of readers) {
    if (read()) return true
  }
  return false
}

/** Same-turn navigations after a successful submit. Cleared on the next task. */
export const suppressUnsavedChangesGuard = (): void => {
  suppressed = true
  queueMicrotask(() => {
    suppressed = false
  })
}

export const registerUnsavedChangesReader = (read: () => boolean): (() => void) => {
  readers.add(read)
  return () => {
    readers.delete(read)
  }
}

/**
 * When the form is dirty, start a document navigation so `beforeunload` can ask.
 * Returns whether the caller should stop its own client navigation.
 */
export const blockClientNavigation = (destination: string, mode: LeaveMode): boolean => {
  if (typeof window === 'undefined' || !hasUnsavedChanges()) return false
  if (isSamePageUrl(destination, window.location.href)) return false
  const url = new URL(destination, window.location.href)
  if (url.origin !== window.location.origin) return false
  if (mode === 'replace') window.location.replace(url.href)
  else window.location.assign(url.href)
  return true
}

/** Record the page we are on after a history update, so Back can return to it. */
const rememberHere = (): void => {
  here.href = window.location.href
  here.state = window.history.state
}

const onBeforeUnload = (event: BeforeUnloadEvent): void => {
  if (!hasUnsavedChanges()) return
  event.preventDefault()
  event.returnValue = ''
}

const onClick = (event: MouseEvent): void => {
  if (!hasUnsavedChanges() || event.defaultPrevented || event.button !== 0) return
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  const target = event.target
  if (!(target instanceof Element)) return
  const anchor = target.closest('a')
  if (!anchor?.href || anchor.hasAttribute('download')) return
  if (anchor.target && anchor.target !== '_self') return

  let url: URL
  try {
    url = new URL(anchor.href)
  } catch {
    return
  }
  if (url.origin !== window.location.origin) return
  if (isSamePageUrl(anchor.href, window.location.href)) return

  event.preventDefault()
  event.stopPropagation()
  window.location.assign(anchor.href)
}

const onPopState = (event: PopStateEvent): void => {
  if (!hasUnsavedChanges() || !here.href) return
  const destination = window.location.href
  if (isSamePageUrl(destination, here.href)) return
  event.stopImmediatePropagation()
  window.history.pushState(here.state, '', here.href)
  window.location.assign(destination)
}

/**
 * Wrap history before Next's router does. Next's patch calls the previous
 * `pushState` for its own entries, so wrapping first is what lets us remember the
 * page a Back press is leaving. Registered once; HMR must not stack listeners.
 */
export const installUnsavedChangesGuard = (): void => {
  if (typeof window === 'undefined') return
  const marked = window as Window & { [INSTALLED]?: boolean }
  if (marked[INSTALLED]) return
  marked[INSTALLED] = true

  rememberHere()

  const nativePush = window.history.pushState.bind(window.history)
  const nativeReplace = window.history.replaceState.bind(window.history)
  window.history.pushState = (data, unused, url) => {
    nativePush(data, unused, url)
    rememberHere()
  }
  window.history.replaceState = (data, unused, url) => {
    nativeReplace(data, unused, url)
    rememberHere()
  }

  window.addEventListener('beforeunload', onBeforeUnload)
  window.addEventListener('popstate', onPopState)
  document.addEventListener('click', onClick, true)
}
