import { cache } from 'react'
import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { getManagedAppointmentAPI } from '@api/appointments/main'
import { GenerateMetadata } from '@interfaces/components'
import { isNotFoundError } from '@helpers/error'
import { PageShell } from '@components/ui/layout'
import { BookingManageClient } from './BookingManageClient'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ token: string }>
}

/** Dedupes generateMetadata + the page body. */
const loadManaged = cache(async (token: string) => {
  try {
    return await getManagedAppointmentAPI({ token })
  } catch (error) {
    if (isNotFoundError(error)) notFound()
    throw error
  }
})

export const generateMetadata: GenerateMetadata<Props> = async ({ params }): Promise<Metadata> => {
  const { token } = await params
  const [t] = await Promise.all([getTranslations('Booking'), loadManaged(token)])

  return {
    title: t('manageMetaTitle'),
    robots: { index: false, follow: false },
  }
}

/**
 * Public capability URL for a booking. A **page**, not a Route Handler — it must
 * render, unlike `/p/[slug]` which 307s. The token is not the appointment id.
 */
export default async function BookingManagePage({ params }: Props) {
  const { token } = await params
  const payload = await loadManaged(token)

  return (
    <PageShell as='article' className='flex flex-col gap-6'>
      <BookingManageClient token={token} initial={payload} />
    </PageShell>
  )
}
