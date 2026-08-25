import { notFound } from 'next/navigation'
import { OVERVIEW_ROUTES } from '@constants/header'
import { ROUTES } from '@constants/routes'
import AppLink from '@components/ui/AppLink'
import { PageHeader, PageShell } from '@components/ui/layout'

const RoutesOverview = () => {
  // Development-only index of every declared route. Several entries in ROUTES
  // have no page yet, so this must never ship.
  if (process.env.NODE_ENV === 'production') notFound()

  return (
    <PageShell className='flex flex-col gap-6'>
      <PageHeader title='Routes overview' subtitle='Development-only index of every declared route.' />
      <nav className='flex flex-wrap gap-4'>
        {OVERVIEW_ROUTES.map(({ label, name }) => {
          const route = ROUTES[name]
          return (
            <AppLink key={route} href={route} className='capitalize'>
              {label}
            </AppLink>
          )
        })}
      </nav>
    </PageShell>
  )
}

export default RoutesOverview
