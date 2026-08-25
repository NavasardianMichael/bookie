import { BreadcrumbList, ListItem } from 'schema-dts'
import { absoluteUrl } from '@helpers/url'

export type BreadcrumbCrumb = {
  name: string
  /** Root-relative path. Omitted from the emitted node for the final crumb. */
  path: string
}

/**
 * Gives a crawler the page's place in the hierarchy explicitly, rather than
 * leaving it to infer one from the URL — and gives an LLM reader the entity's
 * category chain in a single field.
 *
 * The last crumb carries no `item`, per Google's guidance: it is the current page,
 * so pointing it at itself says nothing.
 */
export const getBreadcrumbLDSchema = (trail: BreadcrumbCrumb[]): BreadcrumbList => ({
  '@type': 'BreadcrumbList',
  itemListElement: trail.map(({ name, path }, index) => {
    const crumb: ListItem = {
      '@type': 'ListItem',
      position: index + 1,
      name,
    }

    if (index < trail.length - 1) crumb.item = { '@id': absoluteUrl(path) }

    return crumb
  }),
})
