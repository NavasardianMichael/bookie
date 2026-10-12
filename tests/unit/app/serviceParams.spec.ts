import {
  buildServiceHref,
  parseServiceParam,
  SERVICE_PARAM,
} from '@app/[lang]/providers/[providerId]/components/serviceParams'
import { describe, expect, it } from 'vitest'
import { ROUTES } from '@constants/routes'

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

describe('buildServiceHref', () => {
  it('links to the service list, with the service chosen', () => {
    expect(buildServiceHref('p1', 'svc-1')).toBe(`${ROUTES.providers}/p1?${SERVICE_PARAM}=svc-1#booking-services`)
  })

  it('links to the list alone when no service is named', () => {
    expect(buildServiceHref('p1')).toBe(`${ROUTES.providers}/p1#booking-services`)
  })

  it('round-trips through the parser', () => {
    const query = new URL(buildServiceHref('p1', 'svc-2'), 'https://bookie.test').searchParams
    expect(parseServiceParam({ [SERVICE_PARAM]: query.get(SERVICE_PARAM) ?? undefined }, OFFERED)).toBe('svc-2')
  })
})
