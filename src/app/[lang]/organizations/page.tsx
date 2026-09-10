import { getOrganizationsListLDSchema } from '@linkedDataSchema/organizations'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { getOrganizationsListAPI } from '@api/organizations/main'
import { localizedAlternates } from '@i18n/metadata'
import { ROUTE_KEYS, ROUTES } from '@constants/routes'
import { JsonLd } from '@components/ui/bare/JsonLd'
import { EmptyState } from '@components/ui/EmptyState'
import { PageHeader, PageShell, ResponsiveGrid } from '@components/ui/layout'
import { OrganizationCard } from './components/OrganizationCard'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Organizations')

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: await localizedAlternates(ROUTES[ROUTE_KEYS.organizations]),
  }
}

export default async function Organizations() {
  const [{ allIds, byId }, t, tCommon] = await Promise.all([
    getOrganizationsListAPI(),
    getTranslations('Organizations'),
    getTranslations('Common'),
  ])
  const organizations = allIds.map((organizationId) => byId[organizationId!])

  return (
    <PageShell className='flex flex-col gap-6'>
      <JsonLd data={getOrganizationsListLDSchema(organizations)} />

      <PageHeader
        title={t('title')}
        subtitle={allIds.length ? tCommon('listed', { count: allIds.length }) : undefined}
      />

      {organizations.length ? (
        <ResponsiveGrid as='ul'>
          {organizations.map((organization) => (
            <li key={organization.id}>
              <OrganizationCard data={organization} headingLevel={2} />
            </li>
          ))}
        </ResponsiveGrid>
      ) : (
        <EmptyState title={t('emptyTitle')} description={t('emptyBody')} />
      )}
    </PageShell>
  )
}
