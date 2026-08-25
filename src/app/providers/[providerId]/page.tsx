import { getProviderLDSchema } from '@linkedDataSchema/providers'
import { Metadata } from 'next'
import Image from 'next/image'
import { getSingleProviderAPI } from '@api/providers/main'
import { ProviderProfile as ProviderProfileType } from '@store/providers/profile/types'
import { GenerateMetadata } from '@interfaces/components'
import { ROUTE_KEYS, ROUTES } from '@constants/routes'
import { isUploadedAsset, resolveAbsoluteAssetUrl, resolveAssetUrl } from '@helpers/images'
import { generateGoogleMapsLink } from '@helpers/location'
import { generateFriendlyPhoneNumber } from '@helpers/phone'
import { hasWeekScheduleHours } from '@helpers/schedule'
import AppAvatar from '@components/ui/AppAvatar'
import AppDescriptionList, { AppDescriptionListItem } from '@components/ui/bare/AppDescriptionList'
import AppLink from '@components/ui/bare/AppLink'
import JsonLd from '@components/ui/bare/JsonLd'
import ContactActions from '@components/ui/ContactActions'
import { PageHeader, PageShell, Section } from '@components/ui/layout'
import ProviderDetails from './components/Details'
import ServicesList from './components/ServicesList'
import WorkingHours from './components/WorkingHours'

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
    alternates: { canonical: path },
    openGraph: {
      type: 'profile',
      title,
      description,
      url: path,
      images: ogImage ? [{ url: ogImage, alt: fullName }] : undefined,
    },
  }
}

const Provider = async ({ params }: Props) => {
  const { providerId } = await params

  const provider = await getSingleProviderAPI({ id: providerId })

  const { basic, details, services } = provider
  const organization = basic.organization
  const categories = basic.categories
  const fullName = `${basic.firstName} ${basic.lastName}`
  const image = resolveAssetUrl(basic.image)
  const phone = generateFriendlyPhoneNumber(details.phone, { delimiter: ' ', prefix: '+' })
  const serviceList = services.allIds.map((id) => services.byId[id!]).filter(Boolean)

  const detailItems: AppDescriptionListItem[] = [
    {
      key: 'phone',
      label: 'Phone',
      value: (
        <AppLink href={`tel:${phone}`} className='tnum'>
          {phone}
        </AppLink>
      ),
    },
    {
      key: 'address',
      label: 'Address',
      value: (
        <AppLink href={generateGoogleMapsLink(details.location.address)} target='_blank'>
          {details.location.address}
        </AppLink>
      ),
    },
  ]

  if (details.email) {
    detailItems.push({
      key: 'email',
      label: 'Email',
      value: <AppLink href={`mailto:${details.email}`}>{details.email}</AppLink>,
    })
  }

  if (details.country) {
    detailItems.push({ key: 'country', label: 'Country', value: details.country })
  }

  return (
    <PageShell as='article' className='flex flex-col gap-6'>
      <JsonLd data={getProviderLDSchema(provider)} />

      <PageHeader
        title={fullName}
        subtitle={basic.description}
        media={
          image ? (
            // Fixed aspect box: the raw <img max-w-[160px]> in a never-wrapping
            // row squeezed the text column to ~120px on a phone.
            <div className='bg-surface-sunken relative aspect-[4/3] w-full overflow-hidden rounded-brand md:aspect-square md:w-40'>
              <Image
                src={image}
                alt={fullName}
                fill
                priority
                sizes='(max-width: 768px) 100vw, 160px'
                className='object-cover'
              />
            </div>
          ) : (
            <AppAvatar name={fullName} size={96} shape='square' />
          )
        }
        meta={
          <>
            {categories?.map((category) => (
              <AppLink
                key={category.id}
                href={`${ROUTES[ROUTE_KEYS.categories]}/${category.id}`}
                variant='chip'
                className='min-h-9'
              >
                {category.name}
              </AppLink>
            ))}
            {organization && (
              <AppLink
                href={`${ROUTES[ROUTE_KEYS.organizations]}/${organization.id}`}
                variant='chip'
                className='border-brand text-brand bg-brand-50 min-h-9'
              >
                {organization.basic.name}
              </AppLink>
            )}
          </>
        }
        actions={<ContactActions phone={phone} address={details.location.address} email={details.email} />}
      />

      <Section title='Book an appointment' headingLevel={2}>
        <ProviderDetails initialState={provider} />
      </Section>

      {!!serviceList.length && (
        <Section title='Services' count={serviceList.length} headingLevel={2}>
          <ServicesList services={serviceList} />
        </Section>
      )}

      {hasWeekScheduleHours(details.weekSchedule) && (
        <Section title='Working hours' headingLevel={2}>
          <WorkingHours weekSchedule={details.weekSchedule} />
        </Section>
      )}

      <Section title='Details' headingLevel={2}>
        <AppDescriptionList items={detailItems} />
      </Section>
    </PageShell>
  )
}

export default Provider
