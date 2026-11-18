import { describe, expect, it } from 'vitest'
import { classifyError, resolveErrorCopyKey } from '@helpers/error'
import { createSseParser, toStreamError } from '@helpers/sse'

describe('createSseParser', () => {
  it('reads events split across chunks, with either line ending', () => {
    const parse = createSseParser()
    expect(parse('event: text\r\ndata: {"text":"Hel')).toEqual([])
    expect(parse('lo"}\r\n\r\nevent: done\ndata: {}\n\n')).toEqual([
      { event: 'text', data: { text: 'Hello' } },
      { event: 'done', data: {} },
    ])
  })

  it('passes unparseable data through as text', () => {
    expect(createSseParser()('data: not json\n\n')).toEqual([{ event: 'message', data: 'not json' }])
  })
})

describe('toStreamError', () => {
  // A streamed failure must reach the same copy as any other call: by its code first.
  it('classifies like an axios failure, code and Retry-After included', () => {
    const error = toStreamError(
      { value: null, error: { code: 4105, message: 'spent' }, status: 403, retryAfterSeconds: 30 },
      { method: 'POST', url: '/provider-profile/assistant/messages' }
    )
    const classified = classifyError(error)
    expect(classified.status).toBe(403)
    expect(classified.code).toBe(4105)
    expect(classified.retryAfterSeconds).toBe(30)
    expect(resolveErrorCopyKey(classified)).toBe('codes.assistantLimit')
  })
})
