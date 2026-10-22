import { describe, expect, it } from 'vitest'
import { ProviderServiceFormValues } from '@interfaces/services'
import { SERVICE_AVAILABILITY_FORM_INITIAL_VALUES } from '@constants/services'
import {
  processProviderServiceFormToRequestPayload,
  toServiceAvailability,
  toServiceAvailabilityFormValues,
} from '@components/providerServiceForm/processors'

const FILLED: ProviderServiceFormValues = {
  id: 's-1',
  name: 'Haircut',
  duration: 45,
  description: 'A trim',
  price: 30,
  currency: 'usd',
  image: '/uploads/abc.png',
  availability: SERVICE_AVAILABILITY_FORM_INITIAL_VALUES,
}

describe('processProviderServiceFormToRequestPayload', () => {
  it('carries every filled field through', () => {
    expect(processProviderServiceFormToRequestPayload(FILLED)).toEqual({
      name: 'Haircut',
      duration: 45,
      description: 'A trim',
      price: 30,
      currency: 'usd',
      image: '/uploads/abc.png',
      availability: { mode: 'always' },
    })
  })

  // `id` picks the endpoint at the call site; it is a path segment, never a body field.
  it('never puts the service id in the body', () => {
    expect(processProviderServiceFormToRequestPayload(FILLED)).not.toHaveProperty('id')
  })

  /**
   * The API reads an absent field as "leave this column alone", so an emptied field has
   * to arrive as `''` to clear it. The old builder gated each one behind `if (value)`
   * and dropped it, which made clearing a description or price unsaveable.
   */
  it('sends an emptied optional field as an empty string rather than dropping it', () => {
    const cleared = processProviderServiceFormToRequestPayload({
      ...FILLED,
      description: undefined,
      price: undefined,
      currency: undefined,
    })

    expect(cleared.description).toBe('')
    expect(cleared.price).toBe('')
    expect(cleared.currency).toBe('')
  })

  // antd's InputNumber yields null on clear, and axios drops null from a multipart body
  // while express.json keeps it — so the same edit would behave differently depending on
  // whether an image happened to come along.
  it('normalises a null price to an empty string', () => {
    const cleared = processProviderServiceFormToRequestPayload({
      ...FILLED,
      price: null as unknown as number,
    })

    expect(cleared.price).toBe('')
  })

  it('keeps a zero price as a number, not as cleared', () => {
    expect(processProviderServiceFormToRequestPayload({ ...FILLED, price: 0 }).price).toBe(0)
  })

  // A service has no category — categories belong to the provider.
  it('sends no category field at all', () => {
    const payload = processProviderServiceFormToRequestPayload({
      name: 'Walk-in',
      duration: 20,
      availability: SERVICE_AVAILABILITY_FORM_INITIAL_VALUES,
    })

    expect(payload).toMatchObject({ name: 'Walk-in', duration: 20 })
    expect(payload).not.toHaveProperty('categoryId')
    expect(payload).not.toHaveProperty('categoryName')
  })

  // The API only ever accepts an image as an upload, so the layer below drops a
  // non-File value. The processor passes it along untouched either way.
  it('passes a freshly cropped File through unchanged', () => {
    const file = new File(['x'], 'crop.png', { type: 'image/png' })

    expect(processProviderServiceFormToRequestPayload({ ...FILLED, image: file }).image).toBe(file)
  })
})

/**
 * The form holds every mode's pick at once, so switching modes loses nothing; only the
 * active one may reach the API, or a provider who tried Weekdays and went back to Always
 * would save a weekday rule.
 */
describe('toServiceAvailability', () => {
  const ALL = {
    ...SERVICE_AVAILABILITY_FORM_INITIAL_VALUES,
    weekdays: ['monday' as const],
    monthDays: [16, 1],
    dates: ['2026-11-20', '2026-11-03'],
  }

  it('sends always, whatever else was picked', () => {
    expect(toServiceAvailability({ ...ALL, mode: 'always' })).toEqual({ mode: 'always' })
  })

  it('sends the weekdays of a recurring weekdays pick', () => {
    expect(toServiceAvailability({ ...ALL, mode: 'recurring', recurrence: 'weekdays' })).toEqual({
      mode: 'weekdays',
      days: ['monday'],
    })
  })

  it('sends the days of a recurring month-days pick, in order', () => {
    expect(toServiceAvailability({ ...ALL, mode: 'recurring', recurrence: 'monthDays' })).toEqual({
      mode: 'monthDays',
      days: [1, 16],
    })
  })

  it('sends the dates of a specific-days pick, in order', () => {
    expect(toServiceAvailability({ ...ALL, mode: 'dates' })).toEqual({
      mode: 'dates',
      dates: ['2026-11-03', '2026-11-20'],
    })
  })

  // A mode's field mounts only while it is picked, so the others can be absent from `onFinish`.
  it('tolerates the fields of the other modes being absent', () => {
    expect(toServiceAvailability({ mode: 'recurring' })).toEqual({ mode: 'weekdays', days: [] })
    expect(toServiceAvailability(undefined)).toEqual({ mode: 'always' })
  })
})

describe('toServiceAvailabilityFormValues', () => {
  const OPEN = ['monday' as const, 'tuesday' as const]

  // Switching an "always" service to Weekdays starts from the days the provider is open.
  it('starts an always service on the open weekdays', () => {
    expect(toServiceAvailabilityFormValues({ mode: 'always' }, OPEN, '2026-10-22')).toMatchObject({
      mode: 'always',
      weekdays: OPEN,
    })
  })

  it('reads a stored rule back into its mode', () => {
    expect(toServiceAvailabilityFormValues({ mode: 'monthDays', days: [16] }, OPEN, '2026-10-22')).toMatchObject({
      mode: 'recurring',
      recurrence: 'monthDays',
      monthDays: [16],
    })
    expect(toServiceAvailabilityFormValues({ mode: 'weekdays', days: ['friday'] }, OPEN, '2026-10-22')).toMatchObject({
      mode: 'recurring',
      recurrence: 'weekdays',
      weekdays: ['friday'],
    })
  })

  it('drops dates already gone', () => {
    expect(
      toServiceAvailabilityFormValues({ mode: 'dates', dates: ['2026-10-21', '2026-10-22', '2026-12-01'] }, OPEN, '2026-10-22')
        .dates
    ).toEqual(['2026-10-22', '2026-12-01'])
  })
})
