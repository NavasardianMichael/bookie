import {
  buildServiceHref,
  parseServiceParam,
  SERVICE_PARAM,
  startingServiceId,
} from '@app/[lang]/p/[slug]/components/serviceParams'
import { describe, expect, it } from 'vitest'

const OFFERED = ['svc-1', 'svc-2']

describe('parseServiceParam', () => {
  it('starts with the service the link named, when this provider offers it', () => {
    expect(parseServiceParam({ [SERVICE_PARAM]: 'svc-2' }, OFFERED)).toBe('svc-2')
  })

  it('takes the first of a repeated key', () => {
    expect(parseServiceParam({ [SERVICE_PARAM]: ['svc-1', 'svc-2'] }, OFFERED)).toBe('svc-1')
  })

  // A withdrawn service, another provider's id or a hand-edited value must not reach the
  // booking column as a selection it cannot price or step.
  it('starts with nothing for a service this provider does not offer', () => {
    expect(parseServiceParam({ [SERVICE_PARAM]: 'svc-9' }, OFFERED)).toBeUndefined()
    expect(parseServiceParam({ [SERVICE_PARAM]: '' }, OFFERED)).toBeUndefined()
    expect(parseServiceParam({}, OFFERED)).toBeUndefined()
    expect(parseServiceParam({ [SERVICE_PARAM]: 'svc-1' }, [])).toBeUndefined()
  })
})

describe('startingServiceId', () => {
  it('starts on the service the link named', () => {
    expect(startingServiceId(OFFERED, 'svc-2')).toBe('svc-2')
    expect(startingServiceId(['svc-1'], 'svc-1')).toBe('svc-1')
  })

  it('starts on the only service offered', () => {
    expect(startingServiceId(['svc-1'])).toBe('svc-1')
  })

  it('starts empty when there are several and the link named none', () => {
    expect(startingServiceId(OFFERED)).toBeUndefined()
    expect(startingServiceId([])).toBeUndefined()
  })
})

describe('buildServiceHref', () => {
  it('links to the service list on the provider page, with the service chosen', () => {
    expect(buildServiceHref({ id: 'p1' }, 'svc-1')).toBe(`/p/p1?${SERVICE_PARAM}=svc-1#booking-services`)
  })

  it('links to the list alone when no service is named', () => {
    expect(buildServiceHref({ id: 'p1' })).toBe('/p/p1#booking-services')
  })

  // The page's one canonical URL is the slug's, so a link built from the id would point at
  // an address the page canonicalises away from.
  it('uses the slug when the provider has one', () => {
    expect(buildServiceHref({ id: 'p1', slug: 'acme-hair' }, 'svc-1')).toBe(
      `/p/acme-hair?${SERVICE_PARAM}=svc-1#booking-services`
    )
  })

  it('round-trips through the parser', () => {
    const query = new URL(buildServiceHref({ id: 'p1' }, 'svc-2'), 'https://bookie.test').searchParams
    expect(parseServiceParam({ [SERVICE_PARAM]: query.get(SERVICE_PARAM) ?? undefined }, OFFERED)).toBe('svc-2')
  })
})
