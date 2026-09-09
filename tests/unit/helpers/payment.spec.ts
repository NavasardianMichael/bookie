import { describe, expect, it } from 'vitest'
import { PaymentInfo } from '@interfaces/settings'
import { toPaymentMethods } from '@helpers/payment'

describe('toPaymentMethods', () => {
  it('returns the accepted methods in order', () => {
    expect(toPaymentMethods({ methods: ['cash', 'bank_transfer'] })).toEqual(['cash', 'bank_transfer'])
  })

  it.each([
    ['undefined', undefined],
    ['null', null],
  ])('returns an empty list for %s', (_label, input) => {
    expect(toPaymentMethods(input)).toEqual([])
  })

  it('returns an empty list when the profile accepts nothing', () => {
    expect(toPaymentMethods({ methods: [] })).toEqual([])
  })

  // The migration reshapes stored rows, but a `Provider.draft` overlay round-tripped
  // by a client that predates it can still arrive singular. Reading `.methods`
  // directly would show such a provider as accepting nothing.
  it('reads the pre-migration singular shape', () => {
    const legacy = { method: 'card_on_site' } as unknown as PaymentInfo
    expect(toPaymentMethods(legacy)).toEqual(['card_on_site'])
  })

  it('prefers methods over a leftover method when both are present', () => {
    const both = { methods: ['cash'], method: 'card_on_site' } as unknown as PaymentInfo
    expect(toPaymentMethods(both)).toEqual(['cash'])
  })

  // `Service.currency` is a free string and these columns are opaque JSON, so a value
  // the enum never had is a real possibility — it must not reach a `t()` lookup, which
  // would throw on the missing key rather than silently degrade.
  it('drops values outside the known enum', () => {
    const rogue = { methods: ['cash', 'crypto', 'other', ''] } as unknown as PaymentInfo
    expect(toPaymentMethods(rogue)).toEqual(['cash'])
  })

  it('returns an empty list when methods is not an array', () => {
    const wrong = { methods: 'cash' } as unknown as PaymentInfo
    expect(toPaymentMethods(wrong)).toEqual([])
  })
})
