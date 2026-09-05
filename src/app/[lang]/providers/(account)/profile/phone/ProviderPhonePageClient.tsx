'use client'

import { useEffect, useState } from 'react'
import { Alert } from 'antd'
import { useTranslations } from 'next-intl'
import { getProviderProfileAPI } from '@api/providers/main'
import { ProviderProfile } from '@store/providers/profile/types'
import { processError } from '@helpers/error'
import { ChangePhoneForm } from '@components/settings/ChangePhoneForm'
import { PageHeader } from '@components/ui/layout/PageHeader'
import { Surface } from '@components/ui/layout/Surface'

export const ProviderPhonePageClient = () => {
  const t = useTranslations('Settings')
  const [profile, setProfile] = useState<ProviderProfile | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void getProviderProfileAPI()
      .then(setProfile)
      .catch((err) => setError(processError(err).message))
  }, [])

  return (
    <div className='flex flex-col gap-6'>
      <PageHeader title={t('nav.phone')} subtitle={t('phone.subtitle')} />
      {error && <Alert type='error' showIcon message={error} />}
      {profile ? (
        <ChangePhoneForm currentPhone={profile.details.phone} />
      ) : (
        <Surface className='min-h-40 animate-pulse' />
      )}
    </div>
  )
}
