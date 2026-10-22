import { describe, expect, it } from 'vitest'
import { MAX_CHARS_FOR_TEXTAREA } from '@constants/form'
import { composeProviderDescription, composeProviderTitle, trimAtWord } from '@helpers/providerSeo'

/**
 * The provider page's auto title and description — what search shows when the provider set
 * no override. Shared by the page's `generateMetadata` and the SEO tab's preview.
 */
describe('composeProviderTitle', () => {
  it('reads name, categories, organization, country — in search order', () => {
    expect(
      composeProviderTitle({
        name: 'Anna Petrosyan',
        categories: ['Dentist', 'Orthodontist'],
        organization: 'Smile Clinic',
        country: 'Armenia',
      })
    ).toBe('Anna Petrosyan | Dentist, Orthodontist | Smile Clinic | Armenia')
  })

  it('drops whatever is missing rather than leaving an empty segment', () => {
    expect(composeProviderTitle({ name: 'Anna', categories: [] })).toBe('Anna')
    expect(composeProviderTitle({ name: 'Anna', categories: [], country: 'Armenia' })).toBe('Anna | Armenia')
  })
})

describe('composeProviderDescription', () => {
  const base = {
    categories: ['Dentist'],
    services: ['Cleaning', 'Whitening'],
    intro: 'Book an appointment with Anna.',
    address: '12 Abovyan St, Yerevan',
    country: 'Armenia',
  }

  it('reads intro, categories, services, place — with the intro\'s closing mark at the end', () => {
    expect(composeProviderDescription(base)).toBe(
      'Book an appointment with Anna | Dentist | Cleaning, Whitening | 12 Abovyan St, Yerevan, Armenia.'
    )
  })

  // The intro is translated, and so is its full stop.
  it('keeps the closing mark of the reader\'s language', () => {
    expect(composeProviderDescription({ ...base, intro: 'Ամրագրեք այց Աննայի մոտ։' }).endsWith('Armenia։')).toBe(true)
    expect(composeProviderDescription({ ...base, intro: '预约 Anna。' }).endsWith('Armenia。')).toBe(true)
    expect(composeProviderDescription({ ...base, intro: 'จองนัดหมายกับ Anna' }).endsWith('Armenia')).toBe(true)
  })

  it('does not repeat a country the address already names', () => {
    expect(composeProviderDescription({ ...base, address: 'Yerevan, Armenia' })).toBe(
      'Book an appointment with Anna | Dentist | Cleaning, Whitening | Yerevan, Armenia.'
    )
  })

  it('skips empty parts', () => {
    expect(composeProviderDescription({ ...base, categories: [], services: [], address: undefined })).toBe(
      'Book an appointment with Anna | Armenia.'
    )
  })

  it(`stays within ${MAX_CHARS_FOR_TEXTAREA} characters`, () => {
    const services = Array.from({ length: 60 }, (_, index) => `Service number ${index + 1}`)
    const description = composeProviderDescription({ ...base, services })
    expect([...description].length).toBeLessThanOrEqual(MAX_CHARS_FOR_TEXTAREA)
    expect(description.endsWith('…')).toBe(true)
  })
})

describe('trimAtWord', () => {
  it('leaves short text alone', () => {
    expect(trimAtWord('short text', 20)).toBe('short text')
  })

  it('cuts at a word boundary with an ellipsis, never mid-word', () => {
    expect(trimAtWord('alpha beta gamma delta', 15)).toBe('alpha beta…')
  })

  it('drops a dangling separator before the ellipsis', () => {
    expect(trimAtWord('alpha beta | gamma delta epsilon', 14)).toBe('alpha beta…')
  })

  it('counts characters, not UTF-16 units', () => {
    const armenian = 'Աննա Պետրոսյան '.repeat(5)
    expect([...trimAtWord(armenian, 20)].length).toBeLessThanOrEqual(20)
  })
})
