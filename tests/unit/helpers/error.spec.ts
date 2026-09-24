import { afterEach, describe, expect, it, vi } from 'vitest'
import { AUTH_ERROR_CODES } from '@constants/auth'
import { SLOT_TAKEN_MESSAGE } from '@constants/booking'
import {
  buildErrorDetails,
  classifyError,
  isFormValidationError,
  isNotFoundError,
  processError,
  resolveErrorCopyKey,
  resolveErrorText,
  UserFacingError,
} from '@helpers/error'

type FakeAxiosInit = {
  status?: number
  data?: unknown
  code?: string
  message?: string
  headers?: Record<string, string>
  method?: string
  url?: string
}

/** The shape `isAxiosError` recognises; mocking axios itself is off-limits (tests/CLAUDE.md). */
const axiosError = ({ status, data, code, message = 'Request failed', headers, method, url }: FakeAxiosInit) =>
  Object.assign(new Error(message), {
    isAxiosError: true,
    code,
    config: method || url ? { method, url } : undefined,
    response: status ? { status, data, headers: headers ?? {} } : undefined,
  })

const envelope = (code: number | string, message: string) => ({ value: null, error: { code, message } })

describe('processError', () => {
  it('unwraps an axios error carrying the API envelope', () => {
    const error = axiosError({ status: 404, data: envelope(404, 'Not found') })
    expect(processError(error)).toEqual({ code: 404, message: 'Not found' })
  })

  it('coerces a string code to a number', () => {
    const error = axiosError({ status: 422, data: envelope('422', 'Invalid') })
    expect(processError(error)).toEqual({ code: 422, message: 'Invalid' })
  })

  // It used to call `.toString()` on the code, so an envelope with a null code threw a
  // TypeError from inside the error handler.
  it('falls back to -1 for an envelope with no usable code', () => {
    const error = axiosError({ status: 400, data: { value: null, error: { code: null, message: 'Bad' } } })
    expect(processError(error)).toEqual({ code: -1, message: 'Bad' })
  })

  it('falls back to code -1 for a plain Error', () => {
    expect(processError(new Error('boom'))).toEqual({ code: -1, message: 'boom' })
  })

  it('falls back for an axios error with no envelope', () => {
    const error = axiosError({ message: 'Network Error' })
    expect(processError(error)).toEqual({ code: -1, message: 'Network Error' })
  })

  // Every async action funnels rejections through here, so this must never throw a second
  // error of its own — that replaces the real failure with a crash inside the handler
  // meant to report it. `throw 'nope'` and a bare `Promise.reject()` both land here.
  it.each([null, undefined, 'nope', 42, {}])('returns an AppError for %o rather than throwing', (input) => {
    expect(processError(input)).toEqual({ code: -1, message: 'An unknown error occurred' })
  })
})

describe('classifyError', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it.each([
    [400, 'validation'],
    [401, 'unauthorized'],
    [403, 'forbidden'],
    [404, 'notFound'],
    [408, 'timeout'],
    [409, 'conflict'],
    [413, 'tooLarge'],
    [422, 'validation'],
    [429, 'rateLimited'],
    [500, 'server'],
    [502, 'unavailable'],
    [503, 'unavailable'],
    [504, 'unavailable'],
  ])('sorts an enveloped %i into %s', (status, kind) => {
    const classified = classifyError(axiosError({ status, data: envelope(status, 'server says') }))
    expect(classified.kind).toBe(kind)
    expect(classified.status).toBe(status)
    expect(classified.message).toBe('server says')
  })

  it('keeps the request so a developer can see which call failed', () => {
    const classified = classifyError(
      axiosError({ status: 400, data: envelope(400, 'bad'), method: 'get', url: '/providers/p1/busy?from=x' })
    )
    expect(classified.request).toEqual({ method: 'GET', url: '/providers/p1/busy?from=x' })
    expect(buildErrorDetails(classified).request).toBe('GET /providers/p1/busy?from=x')
  })

  // An nginx error page or Express's default HTML 404 carries no envelope.
  it('classifies a response with no envelope by its status', () => {
    const classified = classifyError(axiosError({ status: 404, data: '<html>Cannot GET /x</html>' }))
    expect(classified).toMatchObject({ kind: 'notFound', code: -1, message: 'Request failed' })
  })

  it('reads Retry-After off a 429', () => {
    const classified = classifyError(
      axiosError({ status: 429, data: envelope(429, 'Too many'), headers: { 'retry-after': '30' } })
    )
    expect(classified.retryAfterSeconds).toBe(30)
    expect(classified.retryable).toBe(true)
  })

  it('treats a request with no response as a network failure', () => {
    expect(classifyError(axiosError({ message: 'Network Error', code: 'ERR_NETWORK' })).kind).toBe('network')
  })

  it('says offline when the browser reports no connection', () => {
    vi.stubGlobal('navigator', { onLine: false })
    expect(classifyError(axiosError({ message: 'Network Error', code: 'ERR_NETWORK' })).kind).toBe('offline')
  })

  it.each(['ECONNABORTED', 'ETIMEDOUT'])('treats %s as a timeout', (code) => {
    expect(classifyError(axiosError({ message: 'timeout of 30000ms exceeded', code })).kind).toBe('timeout')
  })

  it.each([
    Object.assign(new Error('Loading chunk 123 failed.'), { name: 'ChunkLoadError' }),
    new TypeError('Failed to fetch dynamically imported module: https://x/_next/static/chunks/a.js'),
    new TypeError('Importing a module script failed.'),
  ])('recognises a stale build: %s', (error) => {
    const classified = classifyError(error)
    expect(classified.kind).toBe('staleBuild')
    // Its remedy is a reload, so no Retry button is offered.
    expect(classified.retryable).toBe(false)
  })

  it('keeps a UserFacingError message as the copy to show', () => {
    const classified = classifyError(new UserFacingError('Already translated'))
    expect(classified.userMessage).toBe('Already translated')
    expect(classified.retryable).toBe(false)
  })

  // The translated sentence is what a visitor reads; the request that failed is what a
  // developer needs, so the details come from the cause.
  it("takes a UserFacingError's details from its cause", () => {
    const cause = axiosError({
      status: 401,
      data: envelope(AUTH_ERROR_CODES.reauthRequired, 'Current password is incorrect'),
      method: 'delete',
      url: '/identity/account',
    })
    const classified = classifyError(new UserFacingError('Das aktuelle Passwort ist falsch', { cause }))
    expect(classified).toMatchObject({
      userMessage: 'Das aktuelle Passwort ist falsch',
      message: 'Current password is incorrect',
      status: 401,
      code: AUTH_ERROR_CODES.reauthRequired,
      request: { method: 'DELETE', url: '/identity/account' },
    })
  })

  it.each([null, undefined, 42, {}])('never throws for %o', (input) => {
    expect(classifyError(input)).toMatchObject({ kind: 'unknown', code: -1 })
  })

  it('keeps a thrown string as the original message', () => {
    expect(classifyError('nope').message).toBe('nope')
  })

  it.each([
    ['validation', false],
    ['conflict', false],
    ['notFound', false],
    ['server', true],
    ['unavailable', true],
  ] as const)('marks %s retryable: %s', (kind, retryable) => {
    const status = { validation: 400, conflict: 409, notFound: 404, server: 500, unavailable: 503 }[kind]
    expect(classifyError(axiosError({ status, data: envelope(status, 'x') })).retryable).toBe(retryable)
  })
})

describe('resolveErrorCopyKey', () => {
  it('prefers a stable auth code over the kind', () => {
    const classified = classifyError(
      axiosError({ status: 409, data: envelope(AUTH_ERROR_CODES.emailTaken, 'Email already registered') })
    )
    expect(resolveErrorCopyKey(classified)).toBe('codes.emailTaken')
  })

  it('recognises the slot-taken 409 by its message', () => {
    const classified = classifyError(axiosError({ status: 409, data: envelope(409, SLOT_TAKEN_MESSAGE) }))
    expect(resolveErrorCopyKey(classified)).toBe('codes.slotTaken')
  })

  // A withdrawn service also answers 409; telling that visitor to pick another time is a loop.
  it('leaves every other 409 as a generic conflict', () => {
    const classified = classifyError(axiosError({ status: 409, data: envelope(409, 'Service is not available') }))
    expect(resolveErrorCopyKey(classified)).toBe('kinds.conflict')
  })

  it('falls back to the kind', () => {
    expect(resolveErrorCopyKey(classifyError(new Error('boom')))).toBe('kinds.unknown')
  })
})

describe('resolveErrorText', () => {
  const translate = (key: string) => `t:${key}`
  const conflict = classifyError(axiosError({ status: 409, data: envelope(409, 'That link is already taken') }))

  it('translates the resolved key by default, never showing the server text', () => {
    expect(resolveErrorText(conflict, translate)).toBe('t:kinds.conflict')
  })

  it('lets a call site override by code before kind', () => {
    expect(resolveErrorText(conflict, translate, { 409: 'Pick another link', conflict: 'Generic' })).toBe(
      'Pick another link'
    )
    expect(resolveErrorText(conflict, translate, { conflict: 'Generic' })).toBe('Generic')
  })

  it('matches an override on the HTTP status when the envelope code is -1', () => {
    const minusOne = classifyError(axiosError({ status: 400, data: envelope(-1, 'First name is required') }))
    expect(resolveErrorText(minusOne, translate, { 400: 'Check the form' })).toBe('Check the form')
  })

  // A reschedule passes a 409 override for "can no longer be changed"; the slot-taken 409
  // is more specific and must still read as slot taken.
  it('keeps slot taken ahead of a 409 override', () => {
    const slotTaken = classifyError(axiosError({ status: 409, data: envelope(409, SLOT_TAKEN_MESSAGE) }))
    expect(resolveErrorText(slotTaken, translate, { 409: 'Booking locked' })).toBe('t:codes.slotTaken')
  })

  it('lets a stable application code override beat everything but a UserFacingError', () => {
    const invalidToken = classifyError(
      axiosError({ status: 401, data: envelope(AUTH_ERROR_CODES.invalidToken, 'Invalid token') })
    )
    expect(
      resolveErrorText(invalidToken, translate, { [AUTH_ERROR_CODES.invalidToken]: 'Link is dead', 401: 'x' })
    ).toBe('Link is dead')
  })

  it('shows a UserFacingError as-is, whatever the overrides say', () => {
    expect(resolveErrorText(classifyError(new UserFacingError('Mine')), translate, { unknown: 'x' })).toBe('Mine')
  })
})

describe('isNotFoundError', () => {
  it('is true only for an HTTP 404', () => {
    expect(isNotFoundError(axiosError({ status: 404, data: envelope(404, 'Not found') }))).toBe(true)
    expect(isNotFoundError(axiosError({ status: 500, data: envelope(-1, 'Internal') }))).toBe(false)
    expect(isNotFoundError(new Error('404'))).toBe(false)
  })
})

describe('isFormValidationError', () => {
  it("recognises antd's validateFields rejection and nothing else", () => {
    expect(isFormValidationError({ errorFields: [], values: {} })).toBe(true)
    expect(isFormValidationError(new Error('boom'))).toBe(false)
    expect(isFormValidationError(null)).toBe(false)
  })
})
