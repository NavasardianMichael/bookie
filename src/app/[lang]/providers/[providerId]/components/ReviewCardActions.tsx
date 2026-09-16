'use client'

import { FC, useState } from 'react'
import { Alert, App } from 'antd'
import { useTranslations } from 'next-intl'
import { deleteReviewAPI, postReviewReplyAPI, postReviewReportAPI, putReviewAPI } from '@api/reviews/main'
import { Review } from '@store/reviews/list/types'
import { useRouter } from '@i18n/navigation'
import { processError } from '@helpers/error'
import { AppButton } from '@components/ui/AppButton'
import { AppConfirmModal } from '@components/ui/AppConfirmModal'
import { AppSheet } from '@components/ui/AppSheet'
import { FlagIcon } from '@components/ui/icons'
import { ReviewForm, ReviewFormValues } from './ReviewForm'
import { ReviewTextForm, ReviewTextFormValues } from './ReviewTextForm'

type Props = {
  review: Review
  /** The viewer owns the page this review sits on, so they may reply and report. */
  isProviderOwner: boolean
}

/** Which sheet is open. One at a time — they all act on the same review. */
type OpenSheet = 'edit' | 'reply' | 'report' | null

/**
 * The controls on a single review: edit and delete for its author, reply and report for
 * the provider whose page it sits on.
 *
 * The only client island in the review section. Everything around it — the stars, the
 * author, the text, the reply — is server-rendered; this is here because a dialog needs
 * state and a submit needs a handler.
 *
 * After any write it calls `router.refresh()` rather than patching a local copy: the
 * page is a Server Component reading `force-dynamic`, so the refreshed render is the
 * only thing that also updates the summary average and the histogram. Mutating one card
 * in place would leave those two disagreeing with the list beneath them.
 */
export const ReviewCardActions: FC<Props> = ({ review, isProviderOwner }) => {
  const t = useTranslations('Provider.reviews')
  const router = useRouter()
  const { message } = App.useApp()

  const [open, setOpen] = useState<OpenSheet>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const close = () => {
    setOpen(null)
    setError(null)
  }

  /**
   * Every write goes through here so the busy flag, the error surface and the refresh
   * cannot be forgotten by one of the four call sites — which is how three of them end
   * up subtly different.
   */
  const run = async (action: () => Promise<void>, onDone?: () => void) => {
    setIsSubmitting(true)
    setError(null)
    try {
      await action()
      onDone?.()
      router.refresh()
    } catch (err) {
      setError(processError(err).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const submitEdit = async (values: ReviewFormValues) =>
    run(async () => {
      // `comment ?? ''` — `''` is what clears the column. `undefined` would be dropped
      // from the body and the old text would survive under the new rating.
      await putReviewAPI({ id: review.id, rating: values.rating, comment: values.comment ?? '' })
    }, close)

  const submitReply = async (values: ReviewTextFormValues) =>
    run(async () => {
      await postReviewReplyAPI({ id: review.id, reply: values.text })
    }, close)

  const submitReport = async (values: ReviewTextFormValues) =>
    run(async () => {
      await postReviewReportAPI({ id: review.id, reason: values.text })
      message.success(t('reportSent'))
    }, close)

  /**
   * The dialog stays open on failure — `AppConfirmModal` catches the throw and shows the
   * message itself, which is why this deliberately does not try/catch.
   */
  const confirmDelete = async () => {
    await deleteReviewAPI({ id: review.id })
    setConfirmingDelete(false)
    router.refresh()
  }

  if (!review.isMine && !isProviderOwner) return null

  return (
    <div className='flex shrink-0 items-center gap-1'>
      {review.isMine && (
        <>
          <AppButton size='small' type='text' onClick={() => setOpen('edit')}>
            {t('edit')}
          </AppButton>
          <AppButton size='small' type='text' danger onClick={() => setConfirmingDelete(true)}>
            {t('remove')}
          </AppButton>
        </>
      )}

      {isProviderOwner && (
        <>
          {!review.reply && (
            <AppButton size='small' type='text' onClick={() => setOpen('reply')}>
              {t('reply')}
            </AppButton>
          )}
          <AppButton
            size='small'
            type='text'
            icon={<FlagIcon className='h-4 w-4' />}
            aria-label={t('report')}
            onClick={() => setOpen('report')}
          />
        </>
      )}

      <AppSheet open={open === 'edit'} onClose={close} title={t('editTitle')}>
        {open === 'edit' && (
          <div className='flex flex-col gap-4'>
            {error && <Alert type='error' showIcon message={error} />}
            {/*
              `initialValues` loads the edit, never `setFieldsValue` — AppSheet destroys
              its Form while closed, so the instance reachable from here is disconnected.
              The key remounts the form so these values actually apply.
            */}
            <ReviewForm
              key={review.id}
              initialValues={{ rating: review.rating, comment: review.comment }}
              isSubmitting={isSubmitting}
              submitLabel={t('save')}
              onSubmit={submitEdit}
              onCancel={close}
            />
          </div>
        )}
      </AppSheet>

      <AppSheet open={open === 'reply'} onClose={close} title={t('replyTitle')}>
        {open === 'reply' && (
          <div className='flex flex-col gap-4'>
            {error && <Alert type='error' showIcon message={error} />}
            <ReviewTextForm
              label={t('replyLabel')}
              submitLabel={t('replySubmit')}
              isSubmitting={isSubmitting}
              onSubmit={submitReply}
              onCancel={close}
            />
          </div>
        )}
      </AppSheet>

      <AppSheet open={open === 'report'} onClose={close} title={t('reportTitle')}>
        {open === 'report' && (
          <div className='flex flex-col gap-4'>
            <Alert type='info' showIcon message={t('reportDescription')} />
            {error && <Alert type='error' showIcon message={error} />}
            <ReviewTextForm
              label={t('reportLabel')}
              submitLabel={t('reportSubmit')}
              isSubmitting={isSubmitting}
              onSubmit={submitReport}
              onCancel={close}
            />
          </div>
        )}
      </AppSheet>

      {confirmingDelete && (
        <AppConfirmModal
          open
          tone='danger'
          title={t('removeTitle')}
          description={t('removeDescription')}
          okText={t('remove')}
          onConfirm={confirmDelete}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </div>
  )
}
