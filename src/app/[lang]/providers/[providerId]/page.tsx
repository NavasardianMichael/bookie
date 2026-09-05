import { getProviderLDSchema } from '@linkedDataSchema/providers'
import { Metadata } from 'next'
import Image from 'next/image'
import { getSingleProviderAPI } from '@api/providers/main'
import { ProviderProfile as ProviderProfileType } from '@store/providers/profile/types'
import { GenerateMetadata } from '@interfaces/components'
import { DEFAULT_LOCALE } from '@i18n/config'
import { consolidatedAlternates, currentLocale } from '@i18n/metadata'
import { localePath } from '@i18n/pathname'
import { ROUTE_KEYS, ROUTES } from '@constants/routes'
import { getCountryName } from '@helpers/country'
import { isUploadedAsset, resolveAbsoluteAssetUrl, resolveAssetUrl } from '@helpers/images'
import { generateGoogleMapsLink } from '@helpers/location'
import { generateFriendlyPhoneNumber } from '@helpers/phone'
import { hasWeekScheduleHours } from '@helpers/schedule'
import { AppLink } from '@components/ui/bare/AppLink'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { AppText } from '@components/ui/bare/AppText'
import { AppTitle } from '@components/ui/bare/AppTitle'
import { JsonLd } from '@components/ui/bare/JsonLd'
import { ContactActions } from '@components/ui/ContactActions'
import { MapPinIcon, UserIcon } from '@components/ui/icons'
import { PageShell, Surface } from '@components/ui/layout'
import { ProviderDetails } from './components/Details'
import { ServicesList } from './components/ServicesList'
import { WorkingHours } from './components/WorkingHours'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{
    providerId: ProviderProfileType['id']
  }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export const generateMetadata: GenerateMetadata<Props> = async ({ params }): Promise<Metadata> => {
  const { providerId } = await params
  const provider = await getSingleProviderAPI({ id: providerId })

  const { basic, details } = provider
  const fullName = `${basic.firstName} ${basic.lastName}`
  const organizationName = basic.organization?.basic.name
  const categoryNames = basic.categories?.map((category) => category.name) ?? []
  const path = `${ROUTES[ROUTE_KEYS.providers]}/${providerId}`
  // Only a real upload may override app/opengraph-image.tsx. The seeded
  // placeholder is an SVG, and most social platforms refuse to render one — so
  // pointing OG at it would swap a working card for a broken one.
  const ogImage = isUploadedAsset(basic.image) ? resolveAbsoluteAssetUrl(basic.image) : undefined

  const title = [fullName, organizationName, categoryNames.join(', ')].filter(Boolean).join(' | ')
  const description = organizationName
    ? `Book an appointment with ${fullName}, who works at ${organizationName}.`
    : `Book an appointment with ${fullName}.`

  return {
    title,
    description,
    // Filtered rather than interpolated: the previous template wrote the literal
    // string "undefined" into the keywords of every provider with no country or
    // email. Phone and email are also gone from here — a keywords tag is ignored
    // by search engines but is still scraped.
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

export default async function Provider({ params }: Props) {
  const { providerId } = await params

  const provider = await getSingleProviderAPI({ id: providerId })

  const { basic, details, services } = provider
  const organization = basic.organization
  const categories = basic.categories
  const fullName = `${basic.firstName} ${basic.lastName}`
  // Only a real upload is a portrait; the seeded `/logo.svg` gets the placeholder.
  const image = isUploadedAsset(basic.image) ? resolveAssetUrl(basic.image) : undefined
  const phone = generateFriendlyPhoneNumber(details.phone, { delimiter: ' ', prefix: '+' })
  const serviceList = services.allIds.map((id) => services.byId[id!]).filter(Boolean)
  const mapsHref = generateGoogleMapsLink(details.location.address)
  // Stored as an ISO code, so it reads in whatever language the page is in.
  const countryName = getCountryName(details.country, await currentLocale())

  return (
    <PageShell as='article' className='flex flex-col gap-6'>
      <JsonLd data={getProviderLDSchema(provider)} />

      <div className='flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(16rem,22rem)_minmax(0,1fr)] lg:items-start'>
        <aside className='flex flex-col gap-6'>
          <Surface className='flex flex-col items-center text-center'>
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

            {organization && (
              <AppLink
                href={`${ROUTES[ROUTE_KEYS.organizations]}/${organization.id}`}
                variant='plain'
                className='text-body-sm text-brand-muted mt-1 font-medium hover:text-brand'
              >
                {organization.basic.name}
              </AppLink>
            )}

            {!!categories?.length && (
              <div className='mt-3 flex flex-wrap justify-center gap-2'>
                {categories.map((category) => (
                  <AppLink
                    key={category.id}
                    href={`${ROUTES[ROUTE_KEYS.categories]}/${category.id}`}
                    variant='chip'
                    className='h-8 min-h-8 px-3 text-caption'
                  >
                    {category.name}
                  </AppLink>
                ))}
              </div>
            )}

            {basic.description && (
              <AppParagraph size='body-sm' className='mt-5'>
                {basic.description}
              </AppParagraph>
            )}

            <ContactActions
              phone={phone}
              address={details.location.address}
              email={details.email}
              className='mt-6'
            />
          </Surface>

          {!!serviceList.length && (
            <Surface padding='none'>
              <div className='border-brand-border flex items-center justify-between border-b px-6 py-4'>
                <AppTitle level='h2' size='h3'>
                  Services
                </AppTitle>
                <AppText size='overline' tone='muted'>
                  {serviceList.length} {serviceList.length === 1 ? 'option' : 'options'}
                </AppText>
              </div>
              <ServicesList services={serviceList} variant='stack' />
            </Surface>
          )}

          <Surface>
            <AppTitle level='h2' size='h3' className='mb-4'>
              Location
            </AppTitle>
            <div className='bg-surface-sunken mb-4 flex aspect-video w-full items-center justify-center overflow-hidden rounded-brand'>
              <MapPinIcon className='text-brand-300 h-10 w-10' />
            </div>
            <AppLink
              href={mapsHref}
              target='_blank'
              variant='plain'
              className='text-body-sm text-brand-muted flex items-start gap-3 hover:text-brand'
            >
              <MapPinIcon className='mt-0.5 h-5 w-5 shrink-0' />
              <span>
                {details.location.address}
                {countryName ? (
                  <>
                    <br />
                    {countryName}
                  </>
                ) : null}
              </span>
            </AppLink>

            {hasWeekScheduleHours(details.weekSchedule) && (
              <div className='border-brand-border-subtle mt-6 border-t pt-5'>
                <AppTitle level='h2' size='h3' className='mb-3'>
                  Working hours
                </AppTitle>
                <WorkingHours weekSchedule={details.weekSchedule} />
              </div>
            )}
          </Surface>
        </aside>

        <section className='flex min-w-0 flex-col gap-6'>
          <Surface>
            <div className='mb-5'>
              <AppTitle level='h2' size='h3'>
                Book an appointment
              </AppTitle>
              <AppParagraph size='body-sm'>Pick a service, then a day and a time that works.</AppParagraph>
            </div>
            <ProviderDetails initialState={provider} />
          </Surface>
        </section>
      </div>
    </PageShell>
  )
}
