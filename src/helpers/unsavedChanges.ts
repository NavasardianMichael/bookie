/**
 * Whether `destination` is the page already on screen.
 *
 * The path is the page. A new query or hash (a token stripped from the address bar,
 * a filter) stays on it, so it must not ask the visitor to leave. Another path does,
 * including the same screen in another language — that navigation remounts the form.
 * The origin is part of the check so an off-site URL is never treated as "still here".
 */
export const isSamePageUrl = (destination: string, currentHref: string): boolean => {
  const current = new URL(currentHref)
  const next = new URL(destination, current)
  return next.origin === current.origin && next.pathname === current.pathname
}
