import type { ReactNode } from 'react'
import { getProviderLDSchema } from '@linkedDataSchema/providers'
import { ProviderProfile as ProviderProfileType } from '@store/providers/profile/types'
import { JsonLd } from '@components/ui/bare/JsonLd'
import { PageShell } from '@components/ui/layout'
import { ProviderIdentityColumn } from './components/ProviderIdentityColumn'
import { loadProvider } from './loadProvider'

export const dynamic = 'force-dynamic'

type Props = {
  children: ReactNode
  params: Promise<{
    providerId: ProviderProfileType['id']
  }>
}

export default async function ProviderLayout({ children, params }: Props) {
  const { providerId } = await params
  const provider = await loadProvider(providerId)

  return (
    <PageShell as='article' className='flex flex-col gap-6'>
      <JsonLd data={getProviderLDSchema(provider)} />

      <div className='flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(16rem,22rem)_minmax(0,1fr)] lg:items-start'>
        <ProviderIdentityColumn provider={provider} />
        {/* Booking and reviews. This slot is what `[providerId]/loading.tsx` replaces,
            so the identity column above stays in the document while that column streams. */}
        <section className='flex min-w-0 flex-col gap-6'>{children}</section>
      </div>
    </PageShell>
  )
}
