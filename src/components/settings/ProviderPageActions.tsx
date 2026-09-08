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
import { processError } from '@helpers/error'
import { absoluteUrl } from '@helpers/url'
import { AppButton } from '@components/ui/AppButton'
import { AppConfirmModal } from '@components/ui/AppConfirmModal'
import { AppLink } from '@components/ui/bare/AppLink'
import { CopyIcon, EyeIcon, TrashIcon } from '@components/ui/icons'

type Props = {
  listed: boolean
  profileId: string | null
  disabled?: boolean
  onListedChange: (listed: boolean) => void
}

/** Inverse-surface controls on the navy workspace hero. */
const heroSolidClassName = 'bg-surface text-brand hover:bg-brand-50'
const heroGhostClassName = 'border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white'
const heroIconClassName = 'text-white hover:bg-white/20 hover:text-white'

/**
 * Copy / publish / delete for the public provider page. These lived on a Listing
 * settings tab; they belong on the Profile hero because they act on the page itself,
 * not on a separate settings concern.
 */
export const ProviderPageActions: FC<Props> = ({ listed, profileId, disabled, onListedChange }) => {
  const t = useTranslations('Settings')
  const locale = useLocale() as Locale
  const { message } = App.useApp()
  const { push } = useRouter()
  const logout = useAuthStore.use.logout()
  const [saving, setSaving] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const publicPath = profileId ? `${ROUTES.providers}/${profileId}` : null
  const publicUrl = publicPath ? absoluteUrl(localePath(locale, publicPath)) : null

  const setListing = async (next: boolean) => {
    setSaving(true)
    try {
      const data = await putProviderProfileAPI({ mode: 'listing', listed: next })
      onListedChange(data.listed !== false)
      message.success(next ? t('listing.published') : t('listing.unpublished'))
    } catch (err) {
      message.error(processError(err).message)
    } finally {
      setSaving(false)
    }
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
          icon={<CopyIcon className='h-5 w-5' />}
          aria-label={t('listing.copyUrl')}
          disabled={disabled || !publicUrl}
          onClick={() => void copyUrl()}
        />
        <AppButton
          type='text'
          shape='circle'
          danger
          className={heroIconClassName}
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
            loading={saving}
            disabled={disabled}
            onClick={() => void setListing(false)}
          >
            {t('listing.unpublish')}
          </AppButton>
        ) : (
          <AppButton
            type='default'
            className={heroGhostClassName}
            loading={saving}
            disabled={disabled}
            onClick={() => void setListing(true)}
          >
            {t('listing.publishPage')}
          </AppButton>
        )}
      </div>
      <AppConfirmModal
        tone='danger'
        title={t('listing.deleteTitle')}
        description={t('listing.deleteBody')}
        okText={t('listing.deletePage')}
        open={deleteOpen}
        onConfirm={onDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </>
  )
}
