'use client'

import { FC, useState } from 'react'
import { Alert } from 'antd'
import { useTranslations } from 'next-intl'
import { postProviderReviewAPI } from '@api/reviews/main'
import { ReviewsViewer } from '@store/reviews/list/types'
import { useRouter } from '@i18n/navigation'
import { processError } from '@helpers/error'
import { AppButton } from '@components/ui/AppButton'
import { AppSheet } from '@components/ui/AppSheet'
import { ReviewForm, ReviewFormValues } from './ReviewForm'

type Props = {
  providerId: string
  viewer: ReviewsViewer
}

/**
 * "Write a review", shown only to someone who can actually write one.
 *
 * Eligibility is not evaluated here. The API answers it as
 * `viewer.eligibleAppointmentId` — present only when this person has a past,
 * non-cancelled, not-yet-reviewed appointment with this provider — and this component
 * either has an id to submit or renders nothing. Duplicating the rule on the client is
 * how the two versions of it drift apart, and the client's copy would be the wrong one.
 *
 * That also means there is **no sign-in prompt and no auth-pending flicker to manage**:
 * a signed-out visitor gets an empty `viewer` from the server render, so nothing appears
 * and nothing later pops in. The section reads as "reviews", not as a locked door.
 */
export const WriteReviewButton: FC<Props> = ({ providerId, viewer }) => {
  const t = useTranslations('Provider.reviews')
  const router = useRouter()

  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const appointmentId = viewer.eligibleAppointmentId
  if (!appointmentId) return null

  const close = () => {
    setIsOpen(false)
    setError(null)
  }

  const submit = async (values: ReviewFormValues) => {
    setIsSubmitting(true)
    setError(null)
    try {
      await postProviderReviewAPI({
        providerId,
        appointmentId,
        rating: values.rating,
        comment: values.comment,
      })
      close()
      // The page is `force-dynamic`, so the refreshed server render is what updates the
      // list, the average and the histogram together. Inserting the new card locally
      // would leave the summary above it stale.
      router.refresh()
    } catch (err) {
      setError(processError(err).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <AppButton type='primary' onClick={() => setIsOpen(true)}>
        {t('write')}
      </AppButton>

      <AppSheet open={isOpen} onClose={close} title={t('formTitle')}>
        {/* Conditional so the form mounts with the sheet: `AppSheet` uses
            `destroyOnHidden`, and that remount is what resets the stars and the textarea
            between opens without an explicit `resetFields`. */}
        {isOpen && (
          <div className='flex flex-col gap-4'>
            {error && <Alert type='error' showIcon message={error} />}
            <ReviewForm
              isSubmitting={isSubmitting}
              submitLabel={t('submit')}
              onSubmit={submit}
              onCancel={close}
            />
          </div>
        )}
      </AppSheet>
    </>
  )
}
