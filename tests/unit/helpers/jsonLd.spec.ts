import { describe, expect, it } from 'vitest'
import { processError } from '@helpers/error'
import { serializeJsonLd } from '@helpers/jsonLd'
import { generateGoogleMapsLink } from '@helpers/location'

describe('serializeJsonLd', () => {
  it('produces valid JSON that round-trips', () => {
    const data = { '@context': 'https://schema.org', '@type': 'Person', name: 'Ada' }
    expect(JSON.parse(serializeJsonLd(data))).toEqual(data)
  })

  // The whole point: this is embedded as raw text inside a <script>, so a string value
  // must not be able to close the element.
  it('escapes any attempt to close the script element', () => {
    const output = serializeJsonLd({ name: '</script><script>alert(1)</script>' })

    expect(output).not.toContain('<')
    expect(output).not.toContain('>')
    expect(output).toContain('\\u003c')
    expect(JSON.parse(output).name).toBe('</script><script>alert(1)</script>')
  })

  it('escapes ampersands so no HTML entity can be opened', () => {
    expect(serializeJsonLd({ name: 'A & B' })).toContain('\\u0026')
  })

  // U+2028 / U+2029 are legal in JSON but are JavaScript line terminators, so they
  // break any consumer that re-parses the block as JS.
  it('escapes the unicode line separators', () => {
    const output = serializeJsonLd({ name: `a${String.fromCharCode(0x2028)}b${String.fromCharCode(0x2029)}c` })

    expect(output).toContain('\\u2028')
    expect(output).toContain('\\u2029')
    expect(JSON.parse(output).name).toBe(`a${String.fromCharCode(0x2028)}b${String.fromCharCode(0x2029)}c`)
  })

  it('is real JSON, not a JavaScript object literal', () => {
    // serialize-javascript emitted single-quoted keys; strict consumers reject that.
    expect(serializeJsonLd({ name: 'Ada' })).toBe('{"name":"Ada"}')
  })
})

describe('generateGoogleMapsLink', () => {
  it('encodes the address into the query', () => {
    expect(generateGoogleMapsLink('1 Main St, Yerevan')).toBe(
      'https://www.google.com/maps/search/?api=1&query=1%20Main%20St%2C%20Yerevan'
    )
  })

  it('encodes characters that would otherwise break the query string', () => {
    expect(generateGoogleMapsLink('A & B')).toContain('A%20%26%20B')
  })

  it('produces a dangling query for an empty address', () => {
    expect(generateGoogleMapsLink('')).toBe('https://www.google.com/maps/search/?api=1&query=')
  })
})

describe('processError', () => {
  it('unwraps an axios error carrying the API envelope', () => {
    const axiosError = Object.assign(new Error('Request failed'), {
      isAxiosError: true,
      response: { data: { value: null, error: { code: 404, message: 'Not found' } } },
    })

    expect(processError(axiosError)).toEqual({ code: 404, message: 'Not found' })
  })

  it('coerces a string code to a number', () => {
    const axiosError = Object.assign(new Error('Request failed'), {
      isAxiosError: true,
      response: { data: { value: null, error: { code: '422', message: 'Invalid' } } },
    })

    expect(processError(axiosError)).toEqual({ code: 422, message: 'Invalid' })
  })

  it('falls back to code -1 for a plain Error', () => {
    expect(processError(new Error('boom'))).toEqual({ code: -1, message: 'boom' })
  })

  it('falls back for an axios error with no envelope', () => {
    const axiosError = Object.assign(new Error('Network Error'), { isAxiosError: true })
    expect(processError(axiosError)).toEqual({ code: -1, message: 'Network Error' })
  })

  // Every async action funnels rejections through here, so the one input that makes it
  // throw instead of returning an AppError is worth pinning. See docs/BACKLOG.md.
  it.each([null, undefined])('KNOWN BUG: throws on %o instead of returning an AppError', (input) => {
    expect(() => processError(input)).toThrow(TypeError)
  })
})
