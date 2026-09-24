import { PageShell } from '@components/ui/layout'
import { BookingsSkeleton } from './BookingsSkeleton'

export default function BookingsLoading() {
  return (
    <PageShell>
      <BookingsSkeleton />
    </PageShell>
  )
}
