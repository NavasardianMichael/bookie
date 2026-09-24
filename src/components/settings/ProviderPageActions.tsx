'use client'

import { FC, useState } from 'react'
import { App } from 'antd'
import { useLocale, useTranslations } from 'next-intl'
import { deleteProviderProfileAPI, putProviderProfileAPI } from '@api/providers/main'
import { useAuthStore } from '@store/auth/store'
import { type Locale } from '@i18n/config'
import { useRouter } from '@i18n/navigation'
import { localePath } from '@i18n/pathname'
import { ROUTES } from '@constants/routes'
import { absoluteUrl } from '@helpers/url'
import { AppButton } from '@components/ui/AppButton'
import { AppConfirmModal } from '@components/ui/AppConfirmModal'
import { AppLink } from '@components/ui/bare/AppLink'
import { CopyIcon, EyeIcon, TrashIcon } from '@components/ui/icons'

type ListingAction = 'publish' | 'unpublish'

type Props = {
  listed: boolean
  profileId: string | null
  disabled?: boolean
  onListedChange: (listed: boolean) => void
}

/** Inverse-surface controls on the navy workspace hero. */
const heroSolidClassName = 'bg-surface text-brand hover:bg-brand-50'
const heroGhostClassName = 'border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white'
const heroIconClassName = 'hover:bg-white/20'
// antd paints `type="text"` with unlayered `color`, which beats Tailwind `text-white`
// on the same node. Inline color on the button is the override that lands.
const heroIconStyles = { root: { color: 'var(--brand-surface)' } }

/**
 * Copy / publish / delete for the public provider page. These lived on a Listing
 * settings tab; they belong on the Profile hero because they act on the page itself,
 * not on a separate settings concern.
 */
export const ProviderPageActions: FC<Props> = ({ listed, profileId, disabled, onListedChange }) => {
  const t = useTranslations('Settings')
  const tErrors = useTranslations('Errors')
  const locale = useLocale() as Locale
  const { message } = App.useApp()
  const { push } = useRouter()
  const logout = useAuthStore.use.logout()
  const [listingAction, setListingAction] = useState<ListingAction | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const publicPath = profileId ? `${ROUTES.providers}/${profileId}` : null
  const publicUrl = publicPath ? absoluteUrl(localePath(locale, publicPath)) : null

  // AppConfirmModal awaits this and keeps the dialog open on rejection.
  const onConfirmListing = async () => {
    if (!listingAction) return
    const next = listingAction === 'publish'
    const data = await putProviderProfileAPI({ mode: 'listing', listed: next })
    onListedChange(data.listed !== false)
    message.success(next ? t('listing.published') : t('listing.unpublished'))
    setListingAction(null)
  }

  const copyUrl = async () => {
    if (!publicUrl) return
    try {
      await navigator.clipboard.writeText(publicUrl)
      message.success(t('listing.linkCopied'))
    } catch {
      message.error(t('payments.copyFailed'))
    }
  }

  // AppConfirmModal awaits this and keeps the dialog open on rejection.
  const onDelete = async () => {
    await deleteProviderProfileAPI()
    await logout()
    push(ROUTES.home)
  }

  return (
    <>
      <div className='absolute top-6 inset-e-6 z-10 flex gap-1'>
        <AppButton
          type='text'
          shape='circle'
          className={heroIconClassName}
          styles={heroIconStyles}
          icon={<CopyIcon className='h-5 w-5' />}
          aria-label={t('listing.copyUrl')}
          disabled={disabled || !publicUrl}
          onClick={() => void copyUrl()}
        />
        <AppButton
          type='text'
          shape='circle'
          className={heroIconClassName}
          styles={heroIconStyles}
          icon={<TrashIcon className='h-5 w-5' />}
          aria-label={t('listing.deletePage')}
          disabled={disabled}
          onClick={() => setDeleteOpen(true)}
        />
      </div>
      <div className='relative z-10 mt-6 flex flex-wrap gap-3'>
        {publicPath && (
          <AppLink href={publicPath} variant='button' tone='default' className={heroSolidClassName} target='_blank'>
            <span className='inline-flex items-center gap-2'>
              <EyeIcon className='h-4 w-4' />
              {t('listing.preview')}
            </span>
          </AppLink>
        )}
        {listed ? (
          <AppButton
            type='default'
            className={heroGhostClassName}
            disabled={disabled}
            onClick={() => setListingAction('unpublish')}
          >
            {t('listing.unpublish')}
          </AppButton>
        ) : (
          <AppButton
            type='default'
            className={heroGhostClassName}
            disabled={disabled}
            onClick={() => setListingAction('publish')}
          >
            {t('listing.publishPage')}
          </AppButton>
        )}
      </div>
      <AppConfirmModal
        tone={listingAction === 'unpublish' ? 'danger' : 'default'}
        title={listingAction === 'unpublish' ? t('listing.unpublishTitle') : t('listing.publishTitle')}
        description={listingAction === 'unpublish' ? t('listing.unpublishBody') : t('listing.publishBody')}
        okText={listingAction === 'unpublish' ? t('listing.unpublish') : t('listing.publishPage')}
        open={listingAction !== null}
        onConfirm={onConfirmListing}
        onCancel={() => setListingAction(null)}
      />
      <AppConfirmModal
        tone='danger'
        title={t('listing.deleteTitle')}
        description={t('listing.deleteBody')}
        okText={t('listing.deletePage')}
        open={deleteOpen}
        onConfirm={onDelete}
        errorOverrides={{ 409: tErrors('conflicts.pageHasAppointments') }}
        onCancel={() => setDeleteOpen(false)}
      />
    </>
  )
}
