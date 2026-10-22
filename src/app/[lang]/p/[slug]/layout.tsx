import type { ReactNode } from 'react'
import { getProviderLDSchema } from '@linkedDataSchema/providers'
import { getTranslations } from 'next-intl/server'
import { PoweredByBookie } from '@components/brand/PoweredByBookie'
import { JsonLd } from '@components/ui/bare/JsonLd'
import { PageShell } from '@components/ui/layout'
import { ProviderIdentityColumn } from './components/ProviderIdentityColumn'
import { loadProvider } from './loadProvider'
import { resolveProviderPageSeo } from './providerPageSeo'

export const dynamic = 'force-dynamic'

type Props = {
  children: ReactNode
  params: Promise<{ slug: string }>
}

/**
 * The public provider page, `/p/<key>`.
 *
 * **No `loading.tsx` here, on purpose.** A loading boundary streams the page behind a
 * fallback: the services and reviews then arrive in a hidden chunk, and a missing provider's
 * `notFound()` fires after the 200 is sent, so it answers 200 with a noindex meta rather than
 * a 404. With none — and no ancestor boundary — the whole page renders before the first byte.
 */
export default async function ProviderLayout({ children, params }: Props) {
  const { slug } = await params
  const provider = await loadProvider(slug)
  const [seo, tNav] = await Promise.all([resolveProviderPageSeo(provider), getTranslations('Nav')])

  return (
    <PageShell as='article' className='flex flex-col gap-6'>
      <JsonLd
        data={getProviderLDSchema(provider, {
          ...seo,
          labels: { home: tNav('home'), providers: tNav('providers') },
        })}
      />

      <div className='flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(16rem,22rem)_minmax(0,1fr)] lg:items-start'>
        <ProviderIdentityColumn provider={provider} />
        <section className='flex min-w-0 flex-col gap-6'>{children}</section>
      </div>

      {/* Free plans only (`removeBranding`). */}
      {provider.details.showPoweredBy && <PoweredByBookie className='pt-2' />}
    </PageShell>
  )
}
