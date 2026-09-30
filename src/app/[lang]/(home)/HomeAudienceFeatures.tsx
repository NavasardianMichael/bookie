import { FC } from 'react'
import { getTranslations } from 'next-intl/server'
import { cn } from '@helpers/cn'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { AppTitle } from '@components/ui/bare/AppTitle'
import {
  BellIcon,
  BuildingIcon,
  CalendarIcon,
  ChartIcon,
  CheckCircleIcon,
  ClockIcon,
  CreditCardIcon,
  EyeIcon,
  GlobeIcon,
  HeartIcon,
  InboxIcon,
  ListIcon,
  MailIcon,
  SearchIcon,
  ShareIcon,
  StarIcon,
  UserIcon,
} from '@components/ui/icons'
import { Container, ResponsiveGrid, Surface } from '@components/ui/layout'

export type HomeAudience = 'consumers' | 'providers'

type Feature = {
  /** Addresses `Home.audiences.<audience>.features.<key>` in every catalogue. */
  key: string
  icon: FC<{ className?: string }>
}

/**
 * Everything each side of the marketplace can do today. Claim only what the tree ships:
 * reminder emails, for one, are a stored preference with no sender yet, so neither list
 * mentions them. Adding a key here means adding its copy to all 16 catalogues.
 */
const FEATURES: Record<HomeAudience, readonly Feature[]> = {
  consumers: [
    { key: 'search', icon: SearchIcon },
    { key: 'filters', icon: ListIcon },
    { key: 'browse', icon: BuildingIcon },
    { key: 'profiles', icon: EyeIcon },
    { key: 'booking', icon: CalendarIcon },
    { key: 'guest', icon: UserIcon },
    { key: 'manage', icon: ShareIcon },
    { key: 'emails', icon: MailIcon },
    { key: 'bookings', icon: InboxIcon },
    { key: 'favorites', icon: HeartIcon },
    { key: 'reviews', icon: StarIcon },
    { key: 'access', icon: GlobeIcon },
  ],
  providers: [
    { key: 'profile', icon: UserIcon },
    { key: 'visibility', icon: EyeIcon },
    { key: 'link', icon: GlobeIcon },
    { key: 'services', icon: ListIcon },
    { key: 'hours', icon: ClockIcon },
    { key: 'approvals', icon: CheckCircleIcon },
    { key: 'bookings', icon: CalendarIcon },
    { key: 'alerts', icon: BellIcon },
    { key: 'analytics', icon: ChartIcon },
    { key: 'payments', icon: CreditCardIcon },
    { key: 'reviews', icon: StarIcon },
    { key: 'organizations', icon: BuildingIcon },
  ],
}

/** The provider band is tinted so the two lists read as separate blocks, not one long grid. */
const BAND: Record<HomeAudience, string> = {
  consumers: '',
  providers: 'bg-brand-50',
}

type Props = {
  audience: HomeAudience
}

export const HomeAudienceFeatures = async ({ audience }: Props) => {
  const t = await getTranslations(`Home.audiences.${audience}`)
  const headingId = `home-${audience}-features`

  return (
    <section aria-labelledby={headingId} className={cn('py-16 md:py-24', BAND[audience])}>
      <Container>
        <div className='mb-10 flex max-w-2xl flex-col gap-3 md:mb-12'>
          <AppParagraph size='overline' tone='brand'>
            {t('overline')}
          </AppParagraph>
          <AppTitle id={headingId} level='h2' size='h1'>
            {t('title')}
          </AppTitle>
          <AppParagraph className='text-lg'>{t('subtitle')}</AppParagraph>
        </div>
        <ResponsiveGrid as='ul'>
          {FEATURES[audience].map(({ key, icon: Icon }) => (
            <Surface key={key} as='li' className='flex flex-col gap-3'>
              <span className='bg-brand-50 text-brand flex size-10 items-center justify-center rounded-xl'>
                <Icon className='h-5 w-5' />
              </span>
              <AppTitle level='h3'>{t(`features.${key}.title`)}</AppTitle>
              <AppParagraph size='body-sm' className='m-0'>
                {t(`features.${key}.body`)}
              </AppParagraph>
            </Surface>
          ))}
        </ResponsiveGrid>
      </Container>
    </section>
  )
}
