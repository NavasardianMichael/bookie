'use client'

import { FC, useEffect, useState } from 'react'
import { Spin } from 'antd'
import { useTranslations } from 'next-intl'
import { BookingDraft } from '@api/bookingImport/types'
import { getProviderProfileAPI } from '@api/providers/main'
import { ProviderProfile } from '@store/providers/profile/types'
import { AppButton } from '@components/ui/AppButton'
import { AppSheet } from '@components/ui/AppSheet'
import { EmptyState } from '@components/ui/EmptyState'
import { ErrorState } from '@components/ui/ErrorState'
import { PhotoImportPickForm, PhotoPickValues } from './PhotoImportPickForm'
import { PhotoImportReviewForm } from './PhotoImportReviewForm'

type Props = {
  open: boolean
  onClose: () => void
  onImported: (count: number) => void
}

/**
 * "Add from photo": pick a photo of the provider's paper bookings, then check every booking
 * read off it before any is saved.
 *
 * `AppSheet` because it is a form the provider works inside, not a question. It sets
 * `destroyOnHidden`, so the flow below unmounts on close and the next open starts from an
 * empty pick — and the profile is read only once the sheet is opened.
 */
export const PhotoImportSheet: FC<Props> = ({ open, onClose, onImported }) => {
  const t = useTranslations('Bookings.import')
  const [pending, setPending] = useState(false)
  // The sheet stays mounted while closed; a read that outlived it must not lock the next open.
  if (!open && pending) setPending(false)

  return (
    <AppSheet open={open} onClose={onClose} title={t('title')} pending={pending}>
      <PhotoImportFlow onPendingChange={setPending} onImported={onImported} />
    </AppSheet>
  )
}

type FlowProps = {
  onPendingChange: (pending: boolean) => void
  onImported: (count: number) => void
}

const PhotoImportFlow: FC<FlowProps> = ({ onPendingChange, onImported }) => {
  const t = useTranslations('Bookings.import')
  const [profile, setProfile] = useState<ProviderProfile | null>(null)
  const [profileError, setProfileError] = useState<unknown>(null)
  const [profileAttempt, setProfileAttempt] = useState(0)
  const [pick, setPick] = useState<PhotoPickValues>({})
  const [drafts, setDrafts] = useState<BookingDraft[] | null>(null)

  // Read alongside the photo pick, so the review rarely waits on it.
  useEffect(() => {
    let cancelled = false
    void getProviderProfileAPI()
      .then((loaded) => {
        if (cancelled) return
        setProfile(loaded)
        setProfileError(null)
      })
      .catch((error: unknown) => {
        if (!cancelled) setProfileError(error)
      })
    return () => {
      cancelled = true
    }
  }, [profileAttempt])

  if (drafts === null) {
    return (
      <PhotoImportPickForm
        initialValues={pick}
        dailyLimit={profile?.personal.entitlements?.photoImportsPerDay ?? null}
        onPendingChange={onPendingChange}
        onRead={(values, read) => {
          setPick(values)
          setDrafts(read)
        }}
      />
    )
  }

  const tryAnother = <AppButton onClick={() => setDrafts(null)}>{t('tryAnother')}</AppButton>

  if (!drafts.length) {
    return <EmptyState title={t('emptyTitle')} description={t('emptyBody')} action={tryAnother} />
  }

  if (profileError !== null) {
    return (
      <ErrorState
        error={profileError}
        onRetry={() => {
          setProfileError(null)
          setProfileAttempt((current) => current + 1)
        }}
      />
    )
  }

  if (!profile) {
    return (
      <div className='flex justify-center py-10'>
        <Spin />
      </div>
    )
  }

  if (!profile.services.allIds.some((id) => profile.services.byId[id]?.active)) {
    return <EmptyState title={t('noServices')} action={tryAnother} />
  }

  return (
    <PhotoImportReviewForm
      drafts={drafts}
      profile={profile}
      onBack={() => setDrafts(null)}
      onPendingChange={onPendingChange}
      onImported={onImported}
    />
  )
}
