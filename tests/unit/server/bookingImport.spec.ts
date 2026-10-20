import { describe, expect, it } from 'vitest'
import { PLAN_ERROR } from '../../../server/src/lib/plan-errors'
import {
  asDayKey,
  asDraftPhone,
  asWallTime,
  buildImportPrompt,
  findBatchClashes,
  IMPORT_MAX_ROWS,
  importResponseSchema,
  ImportValidationError,
  parseImportBody,
  parseImportResponse,
} from '../../../server/src/services/bookingImport'
import { assertPhotoImport, photoImportPeriod,PLAN_CATALOGUE } from '../../../server/src/services/plans'

const SERVICES = new Set(['svc-cut', 'svc-colour'])

const row = (overrides: Record<string, unknown> = {}) => ({
  serviceId: 'svc-cut',
  startAt: '2026-11-02T10:00:00.000Z',
  fullName: 'Anna Petrosyan',
  phone: { code: 374, number: 91123456 },
  ...overrides,
})

describe('parseImportResponse', () => {
  it('keeps every readable field and turns each empty one into null', () => {
    const raw = JSON.stringify({
      bookings: [
        { fullName: 'Anna  Petrosyan', phone: '+374 91 12-34-56', serviceId: 'svc-cut', date: '2026-11-02', time: '9:30', notes: 'first visit' },
        { fullName: 'Gor', phone: '', serviceId: '', date: '', time: '14:00', notes: '' },
      ],
    })
    expect(parseImportResponse(raw, SERVICES)).toEqual([
      { fullName: 'Anna Petrosyan', phone: '+37491123456', serviceId: 'svc-cut', date: '2026-11-02', time: '09:30', notes: 'first visit' },
      { fullName: 'Gor', phone: null, serviceId: null, date: null, time: '14:00', notes: null },
    ])
  })

  // The schema's enum should prevent it; this is what holds if it does not.
  it("never passes through a service id that is not the provider's", () => {
    const raw = JSON.stringify({ bookings: [{ fullName: 'Anna', serviceId: 'someone-elses' }] })
    expect(parseImportResponse(raw, SERVICES)[0]?.serviceId).toBeNull()
  })

  it('drops an item with nothing readable in it', () => {
    const raw = JSON.stringify({ bookings: [{ fullName: '', phone: '', serviceId: '', date: '', time: '', notes: '' }] })
    expect(parseImportResponse(raw, SERVICES)).toEqual([])
  })

  it('treats junk as "nothing found" rather than failing', () => {
    expect(parseImportResponse('not json', SERVICES)).toEqual([])
    expect(parseImportResponse('{"bookings": "nope"}', SERVICES)).toEqual([])
    expect(parseImportResponse('null', SERVICES)).toEqual([])
    expect(parseImportResponse(JSON.stringify({ bookings: [null, 3, 'x'] }), SERVICES)).toEqual([])
  })

  it('accepts a bare array as well as { bookings }', () => {
    expect(parseImportResponse(JSON.stringify([{ fullName: 'Anna' }]), SERVICES)).toHaveLength(1)
  })

  it('caps the batch', () => {
    const many = Array.from({ length: IMPORT_MAX_ROWS + 5 }, (_, index) => ({ fullName: `Client ${index}` }))
    expect(parseImportResponse(JSON.stringify({ bookings: many }), SERVICES)).toHaveLength(IMPORT_MAX_ROWS)
  })
})

describe('the field narrowers', () => {
  it('accepts only real calendar days', () => {
    expect(asDayKey('2026-02-28')).toBe('2026-02-28')
    expect(asDayKey('2028-02-29')).toBe('2028-02-29')
    expect(asDayKey('2026-02-29')).toBeNull()
    expect(asDayKey('2026-13-01')).toBeNull()
    expect(asDayKey('02/11/2026')).toBeNull()
    expect(asDayKey(20261102)).toBeNull()
  })

  it('pads a 24-hour time and refuses anything else', () => {
    expect(asWallTime('9:05')).toBe('09:05')
    expect(asWallTime('23:59')).toBe('23:59')
    expect(asWallTime('24:00')).toBeNull()
    expect(asWallTime('10:60')).toBeNull()
    expect(asWallTime('3pm')).toBeNull()
  })

  it('keeps a phone as digits, the + only when written, and drops fragments', () => {
    expect(asDraftPhone('091 12 34 56')).toBe('091123456')
    expect(asDraftPhone(' +1 (555) 010-9999 ')).toBe('+15550109999')
    expect(asDraftPhone('1234')).toBeNull()
    expect(asDraftPhone('1234567890123456')).toBeNull()
    expect(asDraftPhone(null)).toBeNull()
  })
})

describe('buildImportPrompt', () => {
  const prompt = buildImportPrompt({
    todayKey: '2026-10-20',
    weekday: 'Tuesday',
    timeZone: 'Asia/Yerevan',
    locale: 'hy',
    services: [{ id: 'svc-cut', name: 'Haircut', durationMinutes: 45 }],
    note: 'All for Thursday. M = manicure',
  })

  it("anchors relative dates on the provider's today and lists their services", () => {
    expect(prompt.text).toContain('Tuesday, 2026-10-20 (Asia/Yerevan)')
    expect(prompt.text).toContain('- svc-cut — Haircut — 45 min')
  })

  it("fences the provider's note as data", () => {
    expect(prompt.text).toContain("Provider's note: <<<All for Thursday. M = manicure>>>")
  })

  it('says so when there is no note', () => {
    expect(buildImportPrompt({ todayKey: '2026-10-20', weekday: 'Tuesday', timeZone: 'UTC', locale: 'en', services: [] }).text).toContain(
      "Provider's note: none."
    )
  })
})

describe('importResponseSchema', () => {
  it("lets serviceId be one of the provider's ids or empty, and nothing else", () => {
    const schema = importResponseSchema(['svc-cut']) as {
      properties: { bookings: { items: { properties: { serviceId: { enum: string[] } } } } }
    }
    expect(schema.properties.bookings.items.properties.serviceId.enum).toEqual(['svc-cut', ''])
  })
})

describe('parseImportBody', () => {
  it('narrows a complete row', () => {
    const [parsed] = parseImportBody({ bookings: [row({ notes: '  bring photos ' })] })
    expect(parsed).toEqual({
      serviceId: 'svc-cut',
      startAt: new Date('2026-11-02T10:00:00.000Z'),
      fullName: 'Anna Petrosyan',
      phoneCode: 374,
      phoneNumber: BigInt(91123456),
      notes: 'bring photos',
    })
  })

  it('reads a phone typed without a country as code 0', () => {
    expect(parseImportBody({ bookings: [row({ phone: { number: 91123456 } })] })[0]?.phoneCode).toBe(0)
  })

  it.each([
    ['no rows', { bookings: [] }],
    ['not a list', { bookings: 'x' }],
    ['too many rows', { bookings: Array.from({ length: IMPORT_MAX_ROWS + 1 }, () => row()) }],
    ['no service', { bookings: [row({ serviceId: ' ' })] }],
    ['a bad time', { bookings: [row({ startAt: 'tomorrow' })] }],
    ['no name', { bookings: [row({ fullName: '   ' })] }],
    ['no phone', { bookings: [row({ phone: undefined })] }],
    ['a negative code', { bookings: [row({ phone: { code: -1, number: 91123456 } })] }],
    ['notes past the cap', { bookings: [row({ notes: 'x'.repeat(301) })] }],
  ])('refuses %s', (_label, body) => {
    expect(() => parseImportBody(body)).toThrow(ImportValidationError)
  })
})

describe('findBatchClashes', () => {
  const at = (hhmm: string) => new Date(`2026-11-02T${hhmm}:00.000Z`)

  it('flags both rows of an overlap and nothing else', () => {
    expect(
      findBatchClashes([
        { startAt: at('10:00'), endAt: at('10:45') },
        { startAt: at('10:30'), endAt: at('11:00') },
        { startAt: at('12:00'), endAt: at('12:30') },
      ])
    ).toEqual([0, 1])
  })

  it('lets back-to-back bookings through', () => {
    expect(
      findBatchClashes([
        { startAt: at('10:00'), endAt: at('10:30') },
        { startAt: at('10:30'), endAt: at('11:00') },
      ])
    ).toEqual([])
  })
})

describe('the daily photo allowance', () => {
  it('counts over the current UTC day', () => {
    expect(photoImportPeriod(new Date('2026-10-20T23:59:59.000Z'))).toEqual({
      start: new Date('2026-10-20T00:00:00.000Z'),
      end: new Date('2026-10-21T00:00:00.000Z'),
    })
  })

  it('gives Free one a day and refuses the second with its own code', () => {
    expect(() => assertPhotoImport(0, PLAN_CATALOGUE.free)).not.toThrow()
    expect(() => assertPhotoImport(1, PLAN_CATALOGUE.free)).toThrow(
      expect.objectContaining({ status: 403, code: PLAN_ERROR.photoImportLimit })
    )
  })

  it('does not meter a paid plan', () => {
    expect(() => assertPhotoImport(500, PLAN_CATALOGUE.basic)).not.toThrow()
  })
})
