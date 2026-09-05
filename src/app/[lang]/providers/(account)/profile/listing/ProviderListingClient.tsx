'use client'

import { useEffect, useState } from 'react'
import { Alert, App } from 'antd'
import { useTranslations } from 'next-intl'
import { getProviderProfileAPI, putProviderProfileAPI } from '@api/providers/main'
import { useAuthStore } from '@store/auth/store'
import { ROUTES } from '@constants/routes'
import { processError } from '@helpers/error'
import { absoluteUrl } from '@helpers/url'
import { AppButton } from '@components/ui/AppButton'
import { AppLink } from '@components/ui/bare/AppLink'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { AppText } from '@components/ui/bare/AppText'
import { AppTitle } from '@components/ui/bare/AppTitle'
import { CopyIcon, EyeIcon } from '@components/ui/icons'
import { PageHeader } from '@components/ui/layout/PageHeader'
import { Surface } from '@components/ui/layout/Surface'

export const ProviderListingClient = () => {
  const t = useTranslations('Settings')
  const { message } = App.useApp()
  const profileId = useAuthStore.use.profileId()
  const [listed, setListed] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void getProviderProfileAPI()
      .then((profile) => setListed(profile.listed !== false))
      .catch((err) => setError(processError(err).message))
      .finally(() => setLoading(false))
  }, [])

  const setListing = async (next: boolean) => {
    setSaving(true)
    setError(null)
    try {
      const data = await putProviderProfileAPI({ mode: 'listing', listed: next })
      setListed(data.listed !== false)
      message.success(next ? t('listing.published') : t('listing.unpublished'))
    } catch (err) {
      setError(processError(err).message)
    } finally {
      setSaving(false)
    }
  }

  const publicPath = profileId ? `${ROUTES.providers}/${profileId}` : null
  const publicUrl = publicPath ? absoluteUrl(publicPath) : null

  return (
    <div className='flex flex-col gap-6'>
      <PageHeader title={t('nav.listing')} subtitle={t('listing.subtitle')} />
      {error && <Alert type='error' showIcon message={error} />}

      <Surface className='flex flex-col gap-6'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <AppTitle level='h2' size='h3'>
            {t('listing.pageStatus')}
          </AppTitle>
          <span
            className={`rounded-full px-3 py-1 text-overline font-bold tracking-widest ${
              listed ? 'bg-green-100 text-green-700' : 'bg-brand-100 text-brand-muted'
            }`}
          >
            {listed ? t('listing.statusActive') : t('listing.statusUnlisted')}
          </span>
        </div>
        <AppParagraph size='body-sm'>{t('listing.body')}</AppParagraph>

        {loading ? (
          <div className='bg-brand-50 min-h-24 animate-pulse rounded-brand' />
        ) : (
          <div className='flex flex-wrap gap-3'>
            {publicPath && (
              <AppLink href={publicPath} variant='button' tone='primary'>
                <span className='inline-flex items-center gap-2'>
                  <EyeIcon className='h-4 w-4' />
                  {t('listing.preview')}
                </span>
              </AppLink>
            )}
            {publicUrl && (
              <AppButton
                type='default'
                icon={<CopyIcon className='h-4 w-4' />}
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(publicUrl)
                    message.success(t('listing.linkCopied'))
                  } catch {
                    message.error(t('payments.copyFailed'))
                  }
                }}
              >
                {t('listing.share')}
              </AppButton>
            )}
            {listed ? (
              <AppButton type='default' danger loading={saving} onClick={() => void setListing(false)}>
                {t('listing.unpublish')}
              </AppButton>
            ) : (
              <AppButton type='primary' loading={saving} onClick={() => void setListing(true)}>
                {t('listing.publishPage')}
              </AppButton>
            )}
          </div>
        )}

        {publicUrl && (
          <AppText size='caption' tone='muted' className='break-all'>
            {publicUrl}
          </AppText>
        )}
      </Surface>
    </div>
  )
}
