import { describe, expect, it } from 'vitest'
import {
  MAX_CHARS_FOR_ADDRESS,
  MAX_CHARS_FOR_ORGANIZATION_NAME,
  MAX_CHARS_FOR_TEXTAREA,
  MAX_CHARS_FOR_WEBSITE,
} from '@constants/form'
import {
  findSameNamedOrganization,
  findSimilarOrganizations,
  MAX_ORGANIZATION_ADDRESS_LENGTH,
  MAX_ORGANIZATION_DESCRIPTION_LENGTH,
  MAX_ORGANIZATION_NAME_LENGTH,
  MAX_ORGANIZATION_SEARCH_RESULTS,
  MAX_ORGANIZATION_WEBSITE_LENGTH,
  MAX_SIMILAR_ORGANIZATIONS,
  parseNewOrganization,
  parseSearchLimit,
  rankOrganizations,
} from '../../../server/src/services/organizations'

/**
 * An organization registered with its provider gets a public page straight away, from an
 * unauthenticated request — so what reaches the row is exactly what these parsers let
 * through, and whether it is a duplicate is decided here.
 */
describe('parseNewOrganization', () => {
  it('keeps every field of a well-formed draft and gives it the provider country', () => {
    expect(
      parseNewOrganization(
        {
          name: 'Acme Services',
          description: 'Hair and nails',
          address: '7 Baghramyan Ave, Yerevan',
          phone: '+37410222333',
          website: 'https://acme.am',
        },
        'AM'
      )
    ).toEqual({
      data: {
        name: 'Acme Services',
        description: 'Hair and nails',
        country: 'AM',
        address: '7 Baghramyan Ave, Yerevan',
        phone: '+37410222333',
        website: 'https://acme.am',
      },
      allowSimilar: false,
    })
  })

  it('trims both ends and collapses inner whitespace on one-line fields', () => {
    const parsed = parseNewOrganization({ name: '  Acme \t  Services  ', address: ' 7   Baghramyan Ave ' }, 'AM')

    expect(parsed?.data.name).toBe('Acme Services')
    expect(parsed?.data.address).toBe('7 Baghramyan Ave')
  })

  it('trims a description but keeps its line breaks', () => {
    expect(parseNewOrganization({ name: 'Acme', description: '  Hair.\nNails.  ' }, 'AM')?.data.description).toBe(
      'Hair.\nNails.'
    )
  })

  it('never leaves a trailing space where a cap cut the text', () => {
    const name = `${'a'.repeat(MAX_ORGANIZATION_NAME_LENGTH - 1)} b`
    expect(parseNewOrganization({ name }, 'AM')?.data.name).toBe('a'.repeat(MAX_ORGANIZATION_NAME_LENGTH - 1))
  })

  it('is nothing without a name', () => {
    expect(parseNewOrganization({ name: '   ', address: '7 Baghramyan Ave' }, 'AM')).toBeUndefined()
    expect(parseNewOrganization({}, 'AM')).toBeUndefined()
    expect(parseNewOrganization(undefined, 'AM')).toBeUndefined()
    expect(parseNewOrganization('Acme', 'AM')).toBeUndefined()
  })

  it("fills the columns' empty default for anything missing", () => {
    expect(parseNewOrganization({ name: 'Acme' }, undefined)?.data).toEqual({
      name: 'Acme',
      description: '',
      country: '',
      address: '',
      phone: '',
      website: '',
    })
  })

  it('stores no email — organizations do not have one', () => {
    expect(parseNewOrganization({ name: 'Acme', email: 'info@acme.am' }, 'AM')?.data).not.toHaveProperty('email')
  })

  it('reads allowSimilar only as a literal true', () => {
    expect(parseNewOrganization({ name: 'Acme', allowSimilar: true }, 'AM')?.allowSimilar).toBe(true)
    expect(parseNewOrganization({ name: 'Acme', allowSimilar: 'true' }, 'AM')?.allowSimilar).toBe(false)
  })

  it('drops a malformed optional field rather than refusing the registration', () => {
    const parsed = parseNewOrganization({ name: 'Acme', phone: '010 222333', website: 'acme.am' }, 'AM')

    expect(parsed?.data).toMatchObject({ phone: '', website: '' })
  })

  it('never stores a website that is not http(s)', () => {
    expect(parseNewOrganization({ name: 'Acme', website: 'javascript:alert(1)' }, 'AM')?.data.website).toBe('')
    expect(parseNewOrganization({ name: 'Acme', website: 'http://acme.am' }, 'AM')?.data.website).toBe(
      'http://acme.am'
    )
  })

  it('truncates long free text at the caps', () => {
    const parsed = parseNewOrganization(
      { name: 'n'.repeat(500), description: 'd'.repeat(500), address: 'a'.repeat(500) },
      'AM'
    )

    expect(parsed?.data.name).toHaveLength(MAX_ORGANIZATION_NAME_LENGTH)
    expect(parsed?.data.description).toHaveLength(MAX_ORGANIZATION_DESCRIPTION_LENGTH)
    expect(parsed?.data.address).toHaveLength(MAX_ORGANIZATION_ADDRESS_LENGTH)
  })

  // The web form and the API have no shared module; this is the pin that keeps a field the
  // form accepts from being cut short on the server.
  it('uses the same limits as the web form', () => {
    expect(MAX_ORGANIZATION_NAME_LENGTH).toBe(MAX_CHARS_FOR_ORGANIZATION_NAME)
    expect(MAX_ORGANIZATION_DESCRIPTION_LENGTH).toBe(MAX_CHARS_FOR_TEXTAREA)
    expect(MAX_ORGANIZATION_ADDRESS_LENGTH).toBe(MAX_CHARS_FOR_ADDRESS)
    expect(MAX_ORGANIZATION_WEBSITE_LENGTH).toBe(MAX_CHARS_FOR_WEBSITE)
  })
})

const ORGANIZATIONS = [
  { id: 'a', name: 'Bright Smile Dental' },
  { id: 'b', name: 'City Health Clinic' },
  { id: 'c', name: 'HeartLine Medical' },
  { id: 'd', name: 'Mindful Therapy Hub' },
  { id: 'e', name: 'Regional Hospital North' },
  { id: 'f', name: 'SkinCare Center' },
]

const ids = (organizations: { id: string }[]) => organizations.map((organization) => organization.id)

describe('rankOrganizations', () => {
  it('puts names that start with the query before names that merely contain it', () => {
    expect(ids(rankOrganizations(ORGANIZATIONS, 're', 5))).toEqual(['e', 'f'])
  })

  it('ignores case, spacing and punctuation', () => {
    expect(ids(rankOrganizations(ORGANIZATIONS, '  HEART-line ', 5))).toEqual(['c'])
  })

  it('tolerates a typo and any word order', () => {
    expect(ids(rankOrganizations(ORGANIZATIONS, 'helth city', 5))).toEqual(['b'])
    expect(ids(rankOrganizations(ORGANIZATIONS, 'mindfull', 5))).toEqual(['d'])
  })

  it('answers at most `limit`', () => {
    expect(rankOrganizations(ORGANIZATIONS, 'e', 2)).toHaveLength(2)
  })
})

describe('findSimilarOrganizations', () => {
  it('finds the same name however it is written, and puts it first', () => {
    const organizations = [{ id: 'x', name: 'City Health Clinics' }, ...ORGANIZATIONS]
    expect(ids(findSimilarOrganizations(organizations, 'city  health-clinic'))).toEqual(['b', 'x'])
  })

  it('finds a near miss — the reason it asks rather than acts', () => {
    expect(ids(findSimilarOrganizations(ORGANIZATIONS, 'Brigth Smile Dental'))).toEqual(['a'])
    expect(ids(findSimilarOrganizations(ORGANIZATIONS, 'SkinCare Center Yerevan'))).toEqual(['f'])
  })

  it('finds nothing for a different organization', () => {
    expect(findSimilarOrganizations(ORGANIZATIONS, 'Acme Dental')).toEqual([])
  })

  it(`answers at most ${MAX_SIMILAR_ORGANIZATIONS}`, () => {
    const clones = Array.from({ length: 6 }, (_, index) => ({ id: String(index), name: 'Acme Dental' }))
    expect(findSimilarOrganizations(clones, 'Acme Dental')).toHaveLength(MAX_SIMILAR_ORGANIZATIONS)
  })
})

describe('findSameNamedOrganization', () => {
  it('links only the same name, never a near miss — the backstop acts without asking', () => {
    expect(findSameNamedOrganization(ORGANIZATIONS, 'city health clinic')?.id).toBe('b')
    expect(findSameNamedOrganization(ORGANIZATIONS, 'City Health Clinics')).toBeUndefined()
  })
})

describe('parseSearchLimit', () => {
  it('honours an integer within range', () => {
    expect(parseSearchLimit('5')).toBe(5)
    expect(parseSearchLimit('1')).toBe(1)
  })

  it('falls back to the cap for anything else, so an old caller keeps its twenty', () => {
    expect(parseSearchLimit(undefined)).toBe(MAX_ORGANIZATION_SEARCH_RESULTS)
    expect(parseSearchLimit('0')).toBe(MAX_ORGANIZATION_SEARCH_RESULTS)
    expect(parseSearchLimit('500')).toBe(MAX_ORGANIZATION_SEARCH_RESULTS)
    expect(parseSearchLimit('2.5')).toBe(MAX_ORGANIZATION_SEARCH_RESULTS)
    expect(parseSearchLimit(['5'])).toBe(MAX_ORGANIZATION_SEARCH_RESULTS)
  })
})
