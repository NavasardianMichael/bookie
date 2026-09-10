import { cache } from 'react'
import { getProviderLDSchema } from '@linkedDataSchema/providers'
import { isAxiosError } from 'axios'
import { Metadata } from 'next'
import { cookies } from 'next/headers'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { getSingleProviderAPI } from '@api/providers/main'
import { ProviderProfile as ProviderProfileType } from '@store/providers/profile/types'
import { GenerateMetadata } from '@interfaces/components'
import { DEFAULT_LOCALE } from '@i18n/config'
import { consolidatedAlternates, currentLocale } from '@i18n/metadata'
import { localePath } from '@i18n/pathname'
import { ROUTE_KEYS, ROUTES } from '@constants/routes'
import { getCountryName } from '@helpers/country'
import { generateEntityPath } from '@helpers/entities'
import { isUploadedAsset, resolveAbsoluteAssetUrl, resolveAssetUrl } from '@helpers/images'
import { generateGoogleMapsLink } from '@helpers/location'
import { acceptsBankTransfer, hasPaymentShare, toPaymentMethods, toPaymentShare } from '@helpers/payment'
import { generateFriendlyPhoneNumber } from '@helpers/phone'
import { hasWeekScheduleHours } from '@helpers/schedule'
import { BankTransferDetails } from '@components/settings/BankTransferDetails'
import { AppLink } from '@components/ui/bare/AppLink'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { AppText } from '@components/ui/bare/AppText'
import { AppTitle } from '@components/ui/bare/AppTitle'
import { JsonLd } from '@components/ui/bare/JsonLd'
import { ContactActions } from '@components/ui/ContactActions'
import { UserIcon } from '@components/ui/icons'
import { PageShell, Surface } from '@components/ui/layout'
import { ProviderDetails } from './components/Details'
import { ProviderShareButton } from './components/ProviderShareButton'
import { WorkingHours } from './components/WorkingHours'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{
    providerId: ProviderProfileType['id']
  }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const loadProvider = cache(async (providerId: string) => {
  const cookie = (await cookies()).toString()
  try {
    return await getSingleProviderAPI({ id: providerId, cookie })
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) notFound()
    throw error
  }
})

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
    // by search engines but is still scraped.
    keywords:
      seo?.keywords ??
      ['Bookie', fullName, ...categoryNames, details.country, details.location.address].filter(Boolean).join(', '),
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

export default async function Provider({ params }: Props) {
  const { providerId } = await params

  const provider = await loadProvider(providerId)

  const { basic, details } = provider
  const organization = basic.organization
  const categories = basic.categories
  const fullName = `${basic.firstName} ${basic.lastName}`
  // Only a real upload is a portrait; the seeded `/logo.svg` gets the placeholder.
  const image = isUploadedAsset(basic.image) ? resolveAssetUrl(basic.image) : undefined
  const phone = generateFriendlyPhoneNumber(details.phone, { delimiter: ' ', prefix: '+' })
  const mapsHref = generateGoogleMapsLink(details.location.address)
  // Stored as an ISO code, so it reads in whatever language the page is in.
  const countryName = getCountryName(details.country, await currentLocale())

  const [tPayments, tCommon, tProvider] = await Promise.all([
    getTranslations('Settings.payments'),
    getTranslations('Common'),
    getTranslations('Provider'),
  ])
  const paymentMethods = toPaymentMethods(details.paymentInfo)
  const paymentShare = toPaymentShare(details.paymentInfo)
  const showTransferDetails = acceptsBankTransfer(details.paymentInfo) && hasPaymentShare(paymentShare)
  const showPayments = !!paymentMethods.length || showTransferDetails

  return (
    <PageShell as='article' className='flex flex-col gap-6'>
      <JsonLd data={getProviderLDSchema(provider)} />

      <div className='flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(16rem,22rem)_minmax(0,1fr)] lg:items-start'>
        <aside className='flex flex-col gap-6'>
          <Surface className='relative flex flex-col items-center text-center'>
            <ProviderShareButton name={fullName} />
            <div className='ring-brand-50 bg-brand-50 relative mb-4 flex size-32 items-center justify-center overflow-hidden rounded-full ring-4'>
              {image ? (
                <Image src={image} alt={fullName} fill priority sizes='128px' className='object-cover' />
              ) : (
                <UserIcon className='text-brand size-16' />
              )}
            </div>

            <AppTitle level='h1' size='h2'>
              {fullName}
            </AppTitle>

            {basic.description && (
              <AppParagraph size='body-sm' className='mt-2'>
                {basic.description}
              </AppParagraph>
            )}

            {(organization || !!categories?.length || !!details.location.address) && (
              <div className='mt-6 flex flex-col items-center gap-1'>
                {organization && (
                  <AppParagraph size='body-sm' className='m-0'>
                    <AppText as='strong' tone='default'>
                      {tCommon('organization')}:{' '}
                    </AppText>
                    <AppLink
                      href={generateEntityPath(ROUTE_KEYS.organizations, organization.id)}
                      variant='plain'
                      className='text-brand-muted hover:text-brand font-medium'
                    >
                      {organization.basic.name}
                    </AppLink>
                  </AppParagraph>
                )}
                {!!categories?.length && (
                  <AppParagraph size='body-sm' className='m-0'>
                    <AppText as='strong' tone='default'>
                      {categories.length === 1 ? tCommon('category') : tCommon('categories')}:{' '}
                    </AppText>
                    {categories.map((category, index) => (
                      <span key={category.id}>
                        {index > 0 ? ', ' : null}
                        <AppLink
                          href={generateEntityPath(ROUTE_KEYS.categories, category.id)}
                          variant='plain'
                          className='text-brand-muted hover:text-brand font-medium'
                        >
                          {category.name}
                        </AppLink>
                      </span>
                    ))}
                  </AppParagraph>
                )}
                {!!details.location.address && (
                  <AppParagraph size='body-sm' className='m-0'>
                    <AppText as='strong' tone='default'>
                      {tCommon('address')}:{' '}
                    </AppText>
                    <AppLink
                      href={mapsHref}
                      target='_blank'
                      variant='plain'
                      className='text-brand-muted hover:text-brand font-medium'
                    >
                      {details.location.address}
                      {countryName ? `, ${countryName}` : null}
                    </AppLink>
                  </AppParagraph>
                )}
              </div>
            )}

            <ContactActions phone={phone} address={details.location.address} email={details.email} className='mt-6' />

            {showPayments && (
              <div className='border-brand-border-subtle mt-6 w-full border-t pt-5 text-start'>
                <AppTitle level='h2' size='h3' className='mb-2'>
                  {tPayments('title')}
                </AppTitle>
                {/* Translated labels, not the raw enum with its underscores swapped
                    for spaces — that rendered English on all 15 locales. */}
                {!!paymentMethods.length && (
                  <AppParagraph size='body-sm' tone='default' className='font-semibold'>
                    {paymentMethods.map((method) => tPayments(`methods.${method}`)).join(', ')}
                  </AppParagraph>
                )}
                {showTransferDetails ? (
                  <div className='mt-3'>
                    <BankTransferDetails {...paymentShare} showHeading={false} />
                  </div>
                ) : null}
              </div>
            )}
          </Surface>

          {hasWeekScheduleHours(details.weekSchedule) && (
            <Surface>
              <AppTitle level='h2' size='h3' className='mb-3'>
                {tProvider('workingHours')}
              </AppTitle>
              <WorkingHours weekSchedule={details.weekSchedule} />
            </Surface>
          )}
        </aside>

        {/* Booking is three stacked panels — service, day, time — all owned by
            ProviderDetails, which holds the selection they share. */}
        <section className='flex min-w-0 flex-col gap-6'>
          <ProviderDetails initialState={provider} />
        </section>
      </div>
    </PageShell>
  )
}
