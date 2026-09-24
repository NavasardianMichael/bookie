import { AxiosError, isAxiosError } from 'axios'
import { APIResponse, AppError } from '@interfaces/api'
import { AUTH_ERROR_CODES } from '@constants/auth'
import { SLOT_TAKEN_MESSAGE } from '@constants/booking'
import { ErrorKind, RETRYABLE_ERROR_KINDS } from '@constants/errors'

const UNKNOWN_ERROR_MESSAGE = 'An unknown error occurred'

/**
 * An error whose message is already copy a person can read — translated, specific, and
 * safe to show in production. Throw one when a call site knows better than the generic
 * copy (`DeleteAccountSection` mapping `AUTH_ERROR_CODES` to its own sentences); every
 * error surface shows its message verbatim in both environments.
 */
export class UserFacingError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'UserFacingError'
  }
}

export type ClassifiedError = AppError & {
  kind: ErrorKind
  /** HTTP status, when the failure was an HTTP response. */
  status?: number
  request?: { method: string; url: string }
  retryAfterSeconds?: number
  retryable: boolean
  stack?: string
  /** Next's reference for a Server Component error, which production strips of its message. */
  digest?: string
  /** Set only for a `UserFacingError`: its message is already the copy to show. */
  userMessage?: string
}

/** Details shown under the friendly copy in development, never in production. */
export type ErrorDetails = {
  message: string
  code: number
  status?: number
  request?: string
  stack?: string
  digest?: string
}

/** Copy a call site supplies for one code (`409`, `4008`) or one kind (`'conflict'`). */
export type ErrorCopyOverrides = Partial<Record<ErrorKind, string>> & Partial<Record<number, string>>

const readEnvelopeError = (data: unknown): AppError | null => {
  const error = (data as Partial<APIResponse<unknown>> | null | undefined)?.error
  if (!error || typeof error !== 'object') return null
  // Typed as a number, but it is whatever the wire carried. `Number(null)` and
  // `Number('')` are 0, which would read as a real code.
  const rawCode: unknown = error.code
  const code = rawCode === null || rawCode === undefined || rawCode === '' ? NaN : Number(rawCode)
  return {
    code: Number.isFinite(code) ? code : -1,
    message: typeof error.message === 'string' ? error.message : UNKNOWN_ERROR_MESSAGE,
  }
}

const readMessage = (e: unknown): string | undefined => {
  const message = (e as { message?: unknown } | null | undefined)?.message
  return typeof message === 'string' ? message : undefined
}

/**
 * Turns an unknown throw into an `AppError`: the server envelope's code and message when
 * there is one, `-1` and the thrown message otherwise.
 *
 * For **branching** on a code (`isSlotTakenError`, `AUTH_ERROR_CODES`). Never render its
 * `message` — that is the server's English text; `useErrorMessage` turns an error into
 * copy.
 *
 * This is the app's last line of error handling, so it must not throw an error of its
 * own: `processError(null)` used to raise a `TypeError`, replacing the real failure with
 * a crash inside the handler meant to report it. A thrown non-Error lands in the fallback.
 */
export const processError = (e: unknown): AppError => {
  if (isAxiosError(e)) {
    const envelope = readEnvelopeError(e.response?.data)
    if (envelope) return envelope
  }
  return {
    code: -1,
    message: readMessage(e) ?? UNKNOWN_ERROR_MESSAGE,
  }
}

const kindFromStatus = (status: number): ErrorKind => {
  if (status === 401) return 'unauthorized'
  if (status === 403) return 'forbidden'
  if (status === 404) return 'notFound'
  if (status === 408) return 'timeout'
  if (status === 409) return 'conflict'
  if (status === 413) return 'tooLarge'
  if (status === 429) return 'rateLimited'
  if (status === 502 || status === 503 || status === 504) return 'unavailable'
  if (status >= 500) return 'server'
  if (status >= 400) return 'validation'
  return 'unknown'
}

/**
 * A deploy replaced the chunks the open page was built against. Worded differently by
 * webpack, Turbopack, Chrome and Safari; the remedy is the same reload for all of them.
 */
const STALE_BUILD_PATTERN =
  /ChunkLoadError|Loading (CSS )?chunk [\w-]+ failed|Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i

const isBrowserOffline = (): boolean => typeof navigator !== 'undefined' && navigator.onLine === false

const readRetryAfter = (headers: unknown): number | undefined => {
  const raw = (headers as Record<string, unknown> | undefined)?.['retry-after']
  const seconds = Number(raw)
  return Number.isFinite(seconds) && seconds > 0 ? seconds : undefined
}

const classifyAxiosError = (error: AxiosError): ClassifiedError => {
  const envelope = readEnvelopeError(error.response?.data)
  const status = error.response?.status

  let kind: ErrorKind
  if (status) kind = kindFromStatus(status)
  else if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') kind = 'timeout'
  else kind = isBrowserOffline() ? 'offline' : 'network'

  return {
    kind,
    code: envelope?.code ?? -1,
    message: envelope?.message ?? error.message,
    status,
    request: error.config
      ? { method: (error.config.method ?? 'get').toUpperCase(), url: error.config.url ?? '' }
      : undefined,
    retryAfterSeconds: readRetryAfter(error.response?.headers),
    retryable: RETRYABLE_ERROR_KINDS.has(kind),
    // No stack: an axios stack points into axios's own internals. `request` is the
    // useful part — it names the call that failed.
  }
}

/**
 * Sorts any throw into an `ErrorKind` and keeps everything the original error said.
 *
 * The kind picks the copy a visitor reads; the rest (`message`, `status`, `request`,
 * `stack`) is what a developer needs, and is shown only in development. An HTTP response
 * without our envelope — an nginx error page, Express's HTML 404 — is still classified
 * by its status.
 */
export const classifyError = (e: unknown): ClassifiedError => {
  if (e instanceof UserFacingError) {
    // The copy is the call site's; the development details are the original failure's,
    // when it passed one as `cause` — a translated sentence alone says nothing about
    // which request failed. Without a cause there is nothing to add, and the stack of
    // the `new UserFacingError` line would only be noise.
    const cause = e.cause === undefined ? undefined : classifyError(e.cause)
    return {
      kind: cause?.kind ?? 'unknown',
      code: cause?.code ?? -1,
      message: cause?.message ?? e.message,
      status: cause?.status,
      request: cause?.request,
      retryable: false,
      stack: cause?.stack,
      userMessage: e.message,
    }
  }

  if (isAxiosError(e)) return classifyAxiosError(e)

  const name = (e as { name?: unknown } | null | undefined)?.name
  const message = readMessage(e) ?? (typeof e === 'string' ? e : UNKNOWN_ERROR_MESSAGE)
  const kind: ErrorKind = STALE_BUILD_PATTERN.test(`${typeof name === 'string' ? name : ''} ${message}`)
    ? 'staleBuild'
    : isBrowserOffline()
      ? 'offline'
      : 'unknown'

  const digest = (e as { digest?: unknown } | null | undefined)?.digest

  return {
    kind,
    code: -1,
    message,
    retryable: RETRYABLE_ERROR_KINDS.has(kind),
    stack: e instanceof Error ? e.stack : undefined,
    digest: typeof digest === 'string' ? digest : undefined,
  }
}

const AUTH_CODE_NAMES = new Map<number, keyof typeof AUTH_ERROR_CODES>(
  (Object.entries(AUTH_ERROR_CODES) as [keyof typeof AUTH_ERROR_CODES, number][]).map(([name, code]) => [code, name])
)

/**
 * The `Errors` catalogue key naming the friendly copy for an error.
 *
 * A stable application code beats the kind: `4008` says *which* conflict, where `409`
 * says only that there was one. The slot-taken 409 is recognised by its message, exactly
 * as `isSlotTakenError` does, because the booking route answers 409 for other reasons too.
 */
export const resolveErrorCopyKey = (error: ClassifiedError): string => {
  const authName = AUTH_CODE_NAMES.get(error.code)
  if (authName) return `codes.${authName}`
  if (isSlotTaken(error)) return 'codes.slotTaken'
  return `kinds.${error.kind}`
}

const isSlotTaken = (error: ClassifiedError): boolean => error.status === 409 && error.message === SLOT_TAKEN_MESSAGE

/**
 * The copy to show, most specific first:
 *
 * 1. a `UserFacingError`'s own message;
 * 2. the call site's override for a stable application code (`4004`) — a code that is
 *    not merely the HTTP status repeated;
 * 3. slot taken — more specific than any 409 a call site anticipates, so a
 *    reschedule's "this booking can no longer be changed" override cannot mask it;
 * 4. the call site's override for the HTTP status, then for the kind;
 * 5. the catalogue.
 *
 * `translate` is `useTranslations('Errors')`, injected so this stays pure.
 */
export const resolveErrorText = (
  error: ClassifiedError,
  translate: (key: string) => string,
  overrides?: ErrorCopyOverrides
): string => {
  if (error.userMessage) return error.userMessage
  const codeOverride = error.code !== error.status ? overrides?.[error.code] : undefined
  if (codeOverride) return codeOverride
  if (isSlotTaken(error)) return translate('codes.slotTaken')
  const override = (error.status ? overrides?.[error.status] : undefined) ?? overrides?.[error.kind]
  return override ?? translate(resolveErrorCopyKey(error))
}

/** A query string reads better decoded; a malformed escape is shown as it came. */
const readableUrl = (url: string): string => {
  try {
    return decodeURIComponent(url)
  } catch {
    return url
  }
}

export const buildErrorDetails = (error: ClassifiedError): ErrorDetails => ({
  message: error.message,
  code: error.code,
  status: error.status,
  request: error.request ? `${error.request.method} ${readableUrl(error.request.url)}` : undefined,
  stack: error.stack,
  digest: error.digest,
})

/** The details as plain lines — for the collapsible block and for `global-error`, which has no antd. */
export const formatErrorDetails = (details: ErrorDetails): string =>
  [
    details.message,
    [
      details.status ? `status ${details.status}` : null,
      details.request,
      details.code !== -1 ? `code ${details.code}` : null,
      details.digest ? `digest ${details.digest}` : null,
    ]
      .filter(Boolean)
      .join(' · '),
    details.stack,
  ]
    .filter(Boolean)
    .join('\n\n')

/** For Server Components: a 404 from the API becomes `notFound()`, anything else rethrows. */
export const isNotFoundError = (e: unknown): boolean => isAxiosError(e) && e.response?.status === 404

/**
 * antd's `validateFields()` rejects with `{ errorFields }` when a field fails its rules.
 * That rejection is already on screen under the field, so it is the one error a submit
 * handler may drop — anything else still has to be surfaced.
 */
export const isFormValidationError = (e: unknown): boolean =>
  typeof e === 'object' && e !== null && Array.isArray((e as { errorFields?: unknown }).errorFields)
