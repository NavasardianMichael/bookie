import { getContactPageLDSchema } from '@linkedDataSchema/contact'
import { describe, expect, it } from 'vitest'
import { LOCALES } from '@i18n/config'
import { getSiteUrl } from '@helpers/url'

/**
 * The distinction pinned here is the one that breaks silently: the page node's `url` must
 * carry the locale so it agrees with that page's canonical, while the `@id`s it references
 * must **not**, because `WebSite` and `Organization` are one entity shared by all 15
 * variants. Get it backwards and `isPartOf`/`about` resolve to nothing.
 */
const nodes = (locale: (typeof LOCALES)[number]) => {
  const graph = getContactPageLDSchema(locale)['@graph']
  if (!Array.isArray(graph)) throw new Error('expected a @graph array')
  return graph as Record<string, unknown>[]
}

const contactPage = (locale: (typeof LOCALES)[number]) => {
  const found = nodes(locale).find((node) => node['@type'] === 'ContactPage')
  if (!found) throw new Error('expected a ContactPage node')
  return found
}

describe('getContactPageLDSchema', () => {
  it('types the page as a ContactPage, not a bare WebPage', () => {
    expect(contactPage('en')['@type']).toBe('ContactPage')
  })

  it('gives every locale a distinct, locale-prefixed page url — English included', () => {
    const urls = LOCALES.map((locale) => contactPage(locale).url as string)

    expect(new Set(urls).size).toBe(LOCALES.length)
    for (const [index, locale] of LOCALES.entries()) {
      expect(urls[index]).toBe(`${getSiteUrl()}/${locale}/contact`)
    }
  })

  it('keeps @id and url in agreement, so the node identifies the page it describes', () => {
    for (const locale of LOCALES) {
      const page = contactPage(locale)
      expect(page['@id']).toBe(page.url)
    }
  })

  it('references the shared site nodes by locale-free @id', () => {
    for (const locale of LOCALES) {
      const page = contactPage(locale)
      expect(page.isPartOf).toEqual({ '@id': `${getSiteUrl()}#website` })
      expect(page.about).toEqual({ '@id': `${getSiteUrl()}#organization` })
    }
  })

  it('declares inLanguage per locale', () => {
    for (const locale of LOCALES) {
      expect(contactPage(locale).inLanguage).toBe(locale)
    }
  })

  it('emits a breadcrumb trail whose last crumb has no item, per Google guidance', () => {
    const breadcrumbs = nodes('en').find((node) => node['@type'] === 'BreadcrumbList')
    const items = breadcrumbs?.itemListElement as Record<string, unknown>[]

    expect(items.map((item) => item.name)).toEqual(['Home', 'Contact'])
    expect(items[0]).toHaveProperty('item')
    expect(items[1]).not.toHaveProperty('item')
  })
})
