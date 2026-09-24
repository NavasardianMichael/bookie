import Image from 'next/image'
import { getTranslations } from 'next-intl/server'
import { SingleProvider } from '@store/providers/single/types'
import { currentLocale } from '@i18n/metadata'
import { ROUTE_KEYS } from '@constants/routes'
import { getCountryName } from '@helpers/country'
import { generateEntityPath } from '@helpers/entities'
import { isUploadedAsset, resolveAssetUrl } from '@helpers/images'
import { generateGoogleMapsLink } from '@helpers/location'
import { acceptsBankTransfer, hasPaymentShare, toPaymentMethods, toPaymentShare } from '@helpers/payment'
import { generateFriendlyPhoneNumber } from '@helpers/phone'
import { hasWeekScheduleHours } from '@helpers/schedule'
import { BankTransferDetails } from '@components/settings/BankTransferDetails'
import { APP_LINK_META_CLASS, AppLink } from '@components/ui/bare/AppLink'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { AppText } from '@components/ui/bare/AppText'
import { AppTitle } from '@components/ui/bare/AppTitle'
import { ContactActions } from '@components/ui/ContactActions'
import { UserIcon } from '@components/ui/icons'
import { Surface } from '@components/ui/layout'
import { ProviderShareButton } from './ProviderShareButton'
import { WorkingHours } from './WorkingHours'

type Props = {
  provider: SingleProvider
}

/**
 * The left column of the public profile: who this provider is, where they are,
 * and when they are open.
 *
 * Rendered from the segment layout, not the page. `loading.tsx` wraps the page
 * only, and a Suspense fallback streams the resolved page as `<div hidden>` until
 * a script reveals it — which is what a document preview and a non-JS crawler
 * actually read. This column has to be ordinary HTML in that response.
 */
export const ProviderIdentityColumn = async ({ provider }: Props) => {
  const { basic, details } = provider
  const organization = basic.organization
  const categories = basic.categories
  const fullName = `${basic.firstName} ${basic.lastName}`
  // Only a real upload is a portrait; the seeded `/logo.svg` gets the placeholder.
  const image = isUploadedAsset(basic.image) ? resolveAssetUrl(basic.image) : undefined
  const phone = details.phone ? generateFriendlyPhoneNumber(details.phone, { delimiter: ' ', prefix: '+' }) : undefined
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
  const showFacts = Boolean(organization || categories?.length || details.location.address || phone)

  return (
    <aside className='flex flex-col gap-6'>
      <Surface className='relative flex flex-col items-center'>
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

        {showFacts && (
          <div className='mt-6 flex flex-col gap-1'>
            {organization && (
              <AppParagraph size='body-sm' className='m-0'>
                <AppText as='strong' tone='default'>
                  {tCommon('organization')}:{' '}
                </AppText>
                <AppLink
                  href={generateEntityPath(ROUTE_KEYS.organizations, organization.id)}
                  variant='plain'
                  className={APP_LINK_META_CLASS}
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
                      className={APP_LINK_META_CLASS}
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
                <AppLink href={mapsHref} target='_blank' variant='plain' className={APP_LINK_META_CLASS}>
                  {details.location.address}
                  {countryName ? `, ${countryName}` : null}
                </AppLink>
              </AppParagraph>
            )}
            {phone && (
              <AppParagraph size='body-sm' className='m-0'>
                <AppText as='strong' tone='default'>
                  {tCommon('phone')}:{' '}
                </AppText>
                <AppLink href={`tel:${phone}`} variant='plain' className={APP_LINK_META_CLASS}>
                  {phone}
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
  )
}
