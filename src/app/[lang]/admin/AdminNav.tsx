import { getTranslations } from 'next-intl/server'
import { ROUTE_KEYS, ROUTES } from '@constants/routes'
import { cn } from '@helpers/cn'
import { AppLink } from '@components/ui/bare/AppLink'

type Props = {
  current: typeof ROUTE_KEYS.adminReviews | typeof ROUTE_KEYS.adminProviders
}

const SECTIONS = [
  { route: ROUTE_KEYS.adminReviews, labelKey: 'reviews' },
  { route: ROUTE_KEYS.adminProviders, labelKey: 'providers' },
] as const

/**
 * The two admin screens, one link each. Nothing else links here — the header does not,
 * and `/routes-overview` excludes both — so this row is how one operator screen reaches
 * the other. Server-rendered: it is plain navigation over the client island below it.
 */
export const AdminNav = async ({ current }: Props) => {
  const t = await getTranslations('Admin.nav')

  return (
    <nav aria-label={t('label')} className='flex flex-wrap gap-2'>
      {SECTIONS.map(({ route, labelKey }) => (
        <AppLink
          key={route}
          href={ROUTES[route]}
          variant='chip'
          aria-current={route === current ? 'page' : undefined}
          className={cn(route === current && 'border-brand text-brand')}
        >
          {t(labelKey)}
        </AppLink>
      ))}
    </nav>
  )
}
