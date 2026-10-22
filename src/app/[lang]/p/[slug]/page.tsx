import { Metadata } from 'next'
import { GenerateMetadata } from '@interfaces/components'
import { isUploadedAsset, resolveAbsoluteAssetUrl } from '@helpers/images'
import { ProviderDetails } from './components/Details'
import { ProviderReviews } from './components/ProviderReviews'
import { parseReviewsPage } from './components/reviewParams'
import { parseServiceParam } from './components/serviceParams'
import { loadProvider } from './loadProvider'
import { resolveProviderPageSeo } from './providerPageSeo'

export const dynamic = 'force-dynamic'

type Props = {
  /** `slug` is the page key: the provider's slug, a slug they gave up, or their id. */
  params: Promise<{ slug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export const generateMetadata: GenerateMetadata<Props> = async ({ params }): Promise<Metadata> => {
  const { slug } = await params
  const provider = await loadProvider(slug)
  const { basic, details } = provider
  const seo = await resolveProviderPageSeo(provider)

  // Only a real upload may override app/opengraph-image.tsx. The seeded
  // placeholder is an SVG, and most social platforms refuse to render one — so
  // pointing OG at it would swap a working card for a broken one.
  const ogImage = isUploadedAsset(basic.image) ? resolveAbsoluteAssetUrl(basic.image) : undefined

  return {
    title: seo.title,
    description: seo.description,
    // Composed from the profile, never typed in. Ignored for ranking by Google, still read
    // by other engines; phone and email stay out because the tag is scraped.
    keywords: [
      basic.fullName,
      ...seo.categoryNames,
      basic.organization?.basic.name,
      details.location.address,
      seo.countryName,
      'Bookie',
    ]
      .filter(Boolean)
      .join(', '),
    classification: seo.categoryNames.join(', '),
    /**
     * One canonical per provider, whatever address the visitor came by — `/p/<id>`, a slug
     * given up, any `?lang=` — and so no hreflang, which would contradict it. The language
     * is a query parameter, not a separate page (`docs/routes/provider-page.md`).
     */
    alternates: { canonical: seo.canonical },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, 'max-snippet': -1, 'max-image-preview': 'large' },
    },
    openGraph: {
      type: 'profile',
      title: seo.title,
      description: seo.description,
      url: seo.canonical,
      locale: seo.locale,
      images: ogImage ? [{ url: ogImage, alt: basic.fullName }] : undefined,
    },
  }
}

export default async function Provider({ params, searchParams }: Props) {
  const { slug } = await params
  const query = await searchParams
  const reviewsPage = parseReviewsPage(query)
  const provider = await loadProvider(slug)
  const initialServiceId = parseServiceParam(query, provider.services.allIds)

  return (
    <>
      {/* Booking is three stacked panels — service, day, time — all owned by
          ProviderDetails, which holds the selection they share. */}
      <ProviderDetails initialState={provider} initialServiceId={initialServiceId} />
      {/* Reviews read as the step after booking, so they close the same column. Paged by the
          provider, never the route segment: the page answers to several keys. */}
      <ProviderReviews providerId={provider.id} slug={provider.seo?.slug} page={reviewsPage} />
    </>
  )
}
