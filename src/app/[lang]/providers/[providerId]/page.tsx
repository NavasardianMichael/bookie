import { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { ProviderProfile as ProviderProfileType } from '@store/providers/profile/types'
import { GenerateMetadata } from '@interfaces/components'
import { DEFAULT_LOCALE } from '@i18n/config'
import { consolidatedAlternates } from '@i18n/metadata'
import { localePath } from '@i18n/pathname'
import { ROUTE_KEYS, ROUTES } from '@constants/routes'
import { isUploadedAsset, resolveAbsoluteAssetUrl } from '@helpers/images'
import { ProviderDetails } from './components/Details'
import { ProviderReviews } from './components/ProviderReviews'
import { parseReviewsPage } from './components/reviewParams'
import { loadProvider } from './loadProvider'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{
    providerId: ProviderProfileType['id']
  }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export const generateMetadata: GenerateMetadata<Props> = async ({ params }): Promise<Metadata> => {
  const { providerId } = await params
  const [provider, tProvider] = await Promise.all([loadProvider(providerId), getTranslations('Provider')])

  const { basic, details, seo } = provider
  const fullName = `${basic.firstName} ${basic.lastName}`
  const organizationName = basic.organization?.basic.name
  const categoryNames = basic.categories?.map((category) => category.name) ?? []
  // Built from the resolved entity's id, never from the route segment: this route also
  // serves `/providers/<slug>`, and taking the canonical from the segment would give one
  // page two canonicals depending on which address the visitor arrived by.
  const path = `${ROUTES[ROUTE_KEYS.providers]}/${provider.id}`
  // Only a real upload may override app/opengraph-image.tsx. The seeded
  // placeholder is an SVG, and most social platforms refuse to render one — so
  // pointing OG at it would swap a working card for a broken one.
  const ogImage = isUploadedAsset(basic.image) ? resolveAbsoluteAssetUrl(basic.image) : undefined

  // Composed from what the profile carries — the fallback whenever the owner has set no
  // override on the SEO tab. An override is only ever a whole replacement: a provider who
  // clears the field gets this back rather than an empty tag, which is why the columns are
  // nullable and `??` rather than `||` would be wrong on an empty string the API already
  // normalised to null.
  const composedTitle = [fullName, organizationName, categoryNames.join(', ')].filter(Boolean).join(' | ')
  const composedDescription = organizationName
    ? tProvider('fallbackWithOrganization', { name: fullName, organization: organizationName })
    : tProvider('fallbackDescription', { name: fullName })

  const title = seo?.title ?? composedTitle
  const description = seo?.description ?? composedDescription

  return {
    title,
    description,
    // Filtered rather than interpolated: the previous template wrote the literal
    // string "undefined" into the keywords of every provider with no country or
    // email. Phone and email are also gone from here — a keywords tag is ignored
    // by search engines but is still scraped. Owner-authored keywords were removed
    // from the SEO tab; this is composed from the profile, not typed in.
    keywords: ['Bookie', fullName, ...categoryNames, details.country, details.location.address]
      .filter(Boolean)
      .join(', '),
    classification: categoryNames.join(', '),
    // Declared per route because the root layout no longer does: metadata is
    // inherited, so an absolute canonical there marked every page a duplicate of `/`.
    //
    // Consolidated rather than localized, unlike every other indexable route: a
    // provider's name, services and descriptions are theirs and are not
    // translated, so the 15 locale variants differ only in chrome. They all
    // canonical onto one — and carry no hreflang, which would contradict it.
    //
    // PHASE 4: the canonical locale becomes the provider's own saved `locale`,
    // which is what makes "his page is shown in the language he selected" true.
    // Until that column exists there is nothing to read, so it falls back to the
    // default and the choice of language is not yet meaningful.
    alternates: await consolidatedAlternates(path, DEFAULT_LOCALE),
    openGraph: {
      type: 'profile',
      title,
      description,
      // The canonical locale's URL, so OG and canonical agree.
      url: localePath(DEFAULT_LOCALE, path),
      images: ogImage ? [{ url: ogImage, alt: fullName }] : undefined,
    },
  }
}

export default async function Provider({ params, searchParams }: Props) {
  const { providerId } = await params
  const reviewsPage = parseReviewsPage(await searchParams)
  const provider = await loadProvider(providerId)

  return (
    <>
      {/* Booking is three stacked panels — service, day, time — all owned by
          ProviderDetails, which holds the selection they share. */}
      <ProviderDetails initialState={provider} />
      {/* Reviews read as the step after booking, so they close the same column.
          `provider.id`, never the route segment: this page also serves
          `/providers/<slug>`, and the section pages itself by id. */}
      <ProviderReviews providerId={provider.id} page={reviewsPage} />
    </>
  )
}
