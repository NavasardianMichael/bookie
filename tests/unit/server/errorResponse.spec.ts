import { describe, expect, it } from 'vitest'
// Import-free on purpose, which is what makes it reachable from this suite — see
// tests/CLAUDE.md. `middleware/error.ts` reads config and cannot be imported here.
import { resolveErrorResponse } from '../../../server/src/lib/error-response'

/** The shapes the libraries throw, by the fields the mapping reads. */
const bodyParserError = (type: string, status: number) =>
  Object.assign(new Error('Unexpected token } in JSON at position 1'), { type, status, statusCode: status, expose: true })
const multerError = (code: string) => Object.assign(new Error('Unexpected field'), { name: 'MulterError', code })
const prismaKnown = (code: string) =>
  Object.assign(new Error('An operation failed because it depends on records that were not found'), {
    name: 'PrismaClientKnownRequestError',
    code,
  })

describe('resolveErrorResponse', () => {
  // These all used to answer 500, so a client mistake read as an outage.
  it('answers malformed JSON with a 400', () => {
    expect(resolveErrorResponse(bodyParserError('entity.parse.failed', 400), true)).toEqual({
      status: 400,
      code: 400,
      message: 'Malformed JSON body',
    })
  })

  it('answers an oversized body with a 413', () => {
    expect(resolveErrorResponse(bodyParserError('entity.too.large', 413), true)).toMatchObject({ status: 413 })
  })

  it.each([
    ['LIMIT_UNEXPECTED_FILE', 400],
    ['LIMIT_FILE_COUNT', 400],
    ['LIMIT_FILE_SIZE', 413],
  ])('maps multer %s to %i', (code, status) => {
    expect(resolveErrorResponse(multerError(code), true)).toMatchObject({ status, code: status })
  })

  it.each([
    ['P2025', 404, 'Not found'],
    ['P2002', 409, 'Conflict'],
    ['P2003', 409, 'Conflict'],
  ])('maps Prisma %s to %i', (code, status, message) => {
    expect(resolveErrorResponse(prismaKnown(code), true)).toEqual({ status, code: status, message })
  })

  it('treats a Prisma validation error as the request being wrong', () => {
    const error = Object.assign(new Error('Argument `firstName`: Invalid value provided.'), {
      name: 'PrismaClientValidationError',
    })
    expect(resolveErrorResponse(error, true)).toEqual({ status: 400, code: 400, message: 'Invalid request' })
  })

  describe('an unknown error', () => {
    const bug = new TypeError("Cannot read properties of undefined (reading 'id')")

    it('stays generic in production', () => {
      expect(resolveErrorResponse(bug, true)).toEqual({ status: 500, code: -1, message: 'Internal server error' })
    })

    // "Show the original error in development" — the client has nothing else to show.
    it('carries the original message everywhere else', () => {
      expect(resolveErrorResponse(bug, false).message).toBe(
        "Internal server error: Cannot read properties of undefined (reading 'id')"
      )
    })

    it.each([null, undefined, 'nope'])('never throws for %o', (input) => {
      expect(resolveErrorResponse(input, true)).toMatchObject({ status: 500 })
    })
  })

  it('does not pass a 5xx status through as a client error', () => {
    const upstream = Object.assign(new Error('upstream'), { status: 502 })
    expect(resolveErrorResponse(upstream, true)).toMatchObject({ status: 500, message: 'Internal server error' })
  })
})
