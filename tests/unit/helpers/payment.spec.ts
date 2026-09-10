import { describe, expect, it } from 'vitest'
import { PaymentInfo } from '@interfaces/settings'
import { acceptsBankTransfer, hasPaymentShare, needsPublicShareConfirm, toPaymentMethods, toPaymentShare } from '@helpers/payment'

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

describe('toPaymentShare', () => {
  it('reads the pay-to number and notes', () => {
    expect(
      toPaymentShare({
        methods: ['bank_transfer'],
        payToNumber: ' 4111 1111 ',
        notes: ' Pay at desk ',
      })
    ).toEqual({
      payToNumber: '4111 1111',
      notes: 'Pay at desk',
    })
  })

  it('joins leftover card and account numbers into one value', () => {
    expect(
      toPaymentShare({
        methods: ['bank_transfer'],
        cardNumber: ' 4111 1111 ',
        accountNumber: ' DE89 3704 ',
      } as PaymentInfo & { cardNumber: string; accountNumber: string })
    ).toEqual({ payToNumber: '4111 1111 / DE89 3704' })
  })

  it('treats a leftover reference as the pay-to number', () => {
    const leftover = { methods: ['cash'], reference: ' IBAN123 ' } as PaymentInfo & { reference: string }
    expect(toPaymentShare(leftover)).toEqual({ payToNumber: 'IBAN123' })
  })

  it('prefers the current field over leftover split keys and reference', () => {
    const both = {
      methods: ['cash'],
      payToNumber: 'new',
      accountNumber: 'old-account',
      cardNumber: 'old-card',
      reference: 'old-ref',
    } as PaymentInfo & { accountNumber: string; cardNumber: string; reference: string }
    expect(toPaymentShare(both)).toEqual({ payToNumber: 'new' })
  })

  it('prefers leftover accountNumber over a leftover reference', () => {
    const both = { methods: ['cash'], accountNumber: 'new', reference: 'old' } as PaymentInfo & {
      accountNumber: string
      reference: string
    }
    expect(toPaymentShare(both)).toEqual({ payToNumber: 'new' })
  })

  it('drops blank strings', () => {
    expect(toPaymentShare({ methods: ['cash'], payToNumber: '  ', notes: '' })).toEqual({})
  })
})

describe('hasPaymentShare', () => {
  it('is false when every field is empty', () => {
    expect(hasPaymentShare({})).toBe(false)
  })

  it('is true when any pay-to field is set', () => {
    expect(hasPaymentShare({ payToNumber: '1' })).toBe(true)
  })
})

describe('needsPublicShareConfirm', () => {
  const cash: PaymentInfo = { methods: ['cash'] }
  const transfer: PaymentInfo = { methods: ['bank_transfer'] }

  it('is true when a new number is added with bank transfer selected', () => {
    expect(needsPublicShareConfirm(transfer, { methods: ['bank_transfer'], payToNumber: '4111' })).toBe(true)
  })

  it('is false when a number is added without bank transfer', () => {
    expect(needsPublicShareConfirm(cash, { methods: ['cash'], payToNumber: '4111' })).toBe(false)
  })

  it('is true when bank transfer is newly selected and a number is already filled', () => {
    expect(
      needsPublicShareConfirm({ methods: ['cash'], payToNumber: '4111' }, { methods: ['bank_transfer'], payToNumber: '4111' })
    ).toBe(true)
  })

  it('is true when an existing number changes', () => {
    expect(
      needsPublicShareConfirm(
        { methods: ['bank_transfer'], payToNumber: '4111' },
        { methods: ['bank_transfer'], payToNumber: '4222' }
      )
    ).toBe(true)
  })

  it('is false when the same number is saved again', () => {
    expect(
      needsPublicShareConfirm(
        { methods: ['bank_transfer'], payToNumber: '4111' },
        { methods: ['bank_transfer'], payToNumber: ' 4111 ' }
      )
    ).toBe(false)
  })

  it('is false when a number is cleared', () => {
    expect(needsPublicShareConfirm({ methods: ['bank_transfer'], payToNumber: '4111' }, transfer)).toBe(false)
  })

  it('is false when only notes change', () => {
    expect(
      needsPublicShareConfirm(
        { methods: ['bank_transfer'], payToNumber: '4111', notes: 'a' },
        { methods: ['bank_transfer'], payToNumber: '4111', notes: 'b' }
      )
    ).toBe(false)
  })

  it('is false when bank transfer is newly selected with notes only', () => {
    expect(
      needsPublicShareConfirm({ methods: ['cash'], notes: 'Pay at desk' }, { methods: ['bank_transfer'], notes: 'Pay at desk' })
    ).toBe(false)
  })
})

describe('acceptsBankTransfer', () => {
  it('is true only when bank transfer is in the method set', () => {
    expect(acceptsBankTransfer({ methods: ['cash', 'bank_transfer'] })).toBe(true)
    expect(acceptsBankTransfer({ methods: ['cash'] })).toBe(false)
    expect(acceptsBankTransfer(undefined)).toBe(false)
  })
})
