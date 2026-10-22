'use client'

import { FC, useEffect, useMemo, useState } from 'react'
import { Spin } from 'antd'
import { useTranslations } from 'next-intl'
import { AssistantProposal } from '@api/profileAssistant/types'
import { getProviderProfileAPI } from '@api/providers/main'
import { ProviderProfile } from '@store/providers/profile/types'
import { proposalFromProfile } from '@helpers/profileAssistant'
import { AppConfirmModal } from '@components/ui/AppConfirmModal'
import { AppSheet } from '@components/ui/AppSheet'
import { ErrorState } from '@components/ui/ErrorState'
import { AssistantPromptForm } from './AssistantPromptForm'
import { AssistantReview } from './AssistantReview'

type Props = {
  open: boolean
  onClose: () => void
  onApplied: () => void
  /** `profileAssistantRunsPerDay`; `null` (unlimited) or not yet known says nothing. */
  dailyLimit: number | null
}

/**
 * The profile assistant: describe the business, then review every drafted settings tab and
 * approve. `AppSheet`, so the flow unmounts on close (`destroyOnHidden`) and the next open
 * starts from an empty description — and the profile is read only once the sheet opens.
 *
 * Closing with a draft under review asks first: nothing is saved until Approve, so a stray
 * click on the mask would otherwise throw away a reviewed workspace.
 */
export const ProfileAssistantSheet: FC<Props> = ({ open, onClose, onApplied, dailyLimit }) => {
  const t = useTranslations('Settings.assistant')
  const [pending, setPending] = useState(false)
  const [reviewing, setReviewing] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  // The sheet stays mounted while closed; a request that outlived it must not lock the next open.
  if (!open && (pending || reviewing)) {
    setPending(false)
    setReviewing(false)
  }

  const requestClose = (): void => {
    if (reviewing) setConfirmDiscard(true)
    else onClose()
  }

  return (
    <>
      <AppSheet open={open} onClose={requestClose} title={t('title')} pending={pending}>
        <ProfileAssistantFlow
          dailyLimit={dailyLimit}
          onPendingChange={setPending}
          onReviewingChange={setReviewing}
          onApplied={onApplied}
        />
      </AppSheet>
      <AppConfirmModal
        open={confirmDiscard}
        tone='warning'
        title={t('discardTitle')}
        description={t('discardBody')}
        okText={t('discard')}
        onConfirm={() => {
          setConfirmDiscard(false)
          onClose()
        }}
        onCancel={() => setConfirmDiscard(false)}
      />
    </>
  )
}

type FlowProps = {
  dailyLimit: number | null
  onPendingChange: (pending: boolean) => void
  onReviewingChange: (reviewing: boolean) => void
  onApplied: () => void
}

const ProfileAssistantFlow: FC<FlowProps> = ({ dailyLimit, onPendingChange, onReviewingChange, onApplied }) => {
  const [profile, setProfile] = useState<ProviderProfile | null>(null)
  const [profileError, setProfileError] = useState<unknown>(null)
  const [profileAttempt, setProfileAttempt] = useState(0)
  const [description, setDescription] = useState('')
  const [proposal, setProposal] = useState<AssistantProposal | null>(null)
  const current = useMemo(() => (profile ? proposalFromProfile(profile) : null), [profile])

  // Read while the provider types, so the review rarely waits on it.
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

  if (proposal === null) {
    return (
      <AssistantPromptForm
        initialDescription={description}
        hasWorkspace={Boolean(current?.services.length)}
        dailyLimit={dailyLimit}
        onPendingChange={onPendingChange}
        onDrafted={(text, drafted) => {
          setDescription(text)
          setProposal(drafted)
          onReviewingChange(true)
        }}
      />
    )
  }

  if (profileError !== null) {
    return (
      <ErrorState
        error={profileError}
        onRetry={() => {
          setProfileError(null)
          setProfileAttempt((attempt) => attempt + 1)
        }}
      />
    )
  }

  if (!profile || !current) {
    return (
      <div className='flex justify-center py-10'>
        <Spin />
      </div>
    )
  }

  return (
    <AssistantReview
      current={current}
      proposal={proposal}
      profile={profile}
      onRewrite={() => {
        setProposal(null)
        onReviewingChange(false)
      }}
      onPendingChange={onPendingChange}
      onApplied={onApplied}
    />
  )
}
