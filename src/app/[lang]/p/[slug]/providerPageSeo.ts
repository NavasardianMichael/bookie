import { getLocale, getTranslations } from 'next-intl/server'
import { SingleProvider } from '@store/providers/single/types'
import { translateCategoryName } from '@helpers/categoryName'
import { getCountryName } from '@helpers/country'
import { providerPageUrl } from '@helpers/entities'
import { composeProviderDescription, composeProviderTitle } from '@helpers/providerSeo'

export type ProviderPageSeo = {
  locale: string
  /** The one indexable URL, `/p/<slug ?? id>` on the site origin. */
  canonical: string
  title: string
  description: string
  /** Translated, for the title, keywords and JSON-LD. */
  categoryNames: string[]
  countryName?: string
}

/**
 * What the page tells search engines about itself — read by `generateMetadata` and by the
 * layout's JSON-LD, so the `<title>`, the meta description and `WebPage.name` cannot drift.
 *
 * An override from the SEO tab replaces its value whole; otherwise the value is composed
 * (`@helpers/providerSeo`), with every name in the reader's language.
 */
export const resolveProviderPageSeo = async (provider: SingleProvider): Promise<ProviderPageSeo> => {
  const [locale, tProvider, tCategories] = await Promise.all([
    getLocale(),
    getTranslations('Provider'),
    getTranslations('Categories'),
  ])
  const { basic, details, seo } = provider
  const categoryNames = basic.categories?.map((category) => translateCategoryName(category.name, tCategories)) ?? []
  const countryName = getCountryName(details.country, locale)
  const services = provider.services.allIds
    .map((id) => provider.services.byId[id!])
    .filter((service) => service?.active !== false)
    .map((service) => service!.name)

  return {
    locale,
    canonical: providerPageUrl({ id: provider.id, slug: seo?.slug }),
    title:
      seo?.title ??
      composeProviderTitle({
        name: basic.fullName,
        categories: categoryNames,
        organization: basic.organization?.basic.name,
        country: countryName,
      }),
    description:
      seo?.description ??
      composeProviderDescription({
        categories: categoryNames,
        services,
        intro: tProvider('fallbackDescription', { name: basic.fullName }),
        address: details.location.address,
        country: countryName,
      }),
    categoryNames,
    countryName,
  }
}
