import { ProviderBookingsClient } from '../bookings/ProviderBookingsClient'

export const dynamic = 'force-dynamic'

export default function ProviderConsumerBookingsPage() {
  return <ProviderBookingsClient side='consumer' />
}
