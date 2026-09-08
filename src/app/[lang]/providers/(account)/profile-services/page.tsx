import { Metadata } from 'next'
import { ProviderOnboardingDone } from './ProviderOnboardingDone'
import { ProviderServices } from './ProviderServices'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Your Services',
  description: 'Create and manage the services clients can book.',
}

/**
 * No `PageShell` here: `(account)/layout.tsx` already wraps every tab in one, and
 * a second Container doubled the gutters — this page sat visibly narrower than
 * its six sibling tabs. The heading also lives in `ProviderServices` rather than
 * here, because the prototype puts "Add new service" in the heading row and that
 * button needs the client component's handler.
 */
export default function ProviderServicesPage() {
  return (
    <div className='flex flex-col gap-8'>
      <ProviderServices />
      <ProviderOnboardingDone />
    </div>
  )
}
