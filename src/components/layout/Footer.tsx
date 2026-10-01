import { FC } from 'react'
import { useTranslations } from 'next-intl'
import { useAuthStore } from '@store/auth/store'
import { USER_TYPES } from '@constants/auth'
import { ROUTES } from '@constants/routes'
import { BrandLockup } from '@components/brand/BrandLockup'
import { AppLink } from '@components/ui/bare/AppLink'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { AppText } from '@components/ui/bare/AppText'
import { Container } from '@components/ui/layout/Container'
import { LanguageSwitcher } from './LanguageSwitcher'

type FooterLink = {
  href: string
  labelKey: string
  /** Hidden once signed in: a way *into* the app, which a session has no use for. */
  guestOnly?: boolean
  /** Hidden from consumer sessions: clients never pay, so plans are not their concern. */
  providersOnly?: boolean
}

/** Keys into the `Footer` message namespace, not copy — see src/i18n/CLAUDE.md. */
const FOOTER_COLUMNS: { titleKey: string; links: FooterLink[] }[] = [
  {
    titleKey: 'platform',
    links: [
      { href: ROUTES.providers, labelKey: 'findProvider', guestOnly: true },
      { href: ROUTES.categories, labelKey: 'categories' },
      { href: ROUTES.organizations, labelKey: 'organizations' },
      { href: ROUTES.pricing, labelKey: 'pricing', providersOnly: true },
    ],
  },
  {
    titleKey: 'account',
    links: [
      { href: ROUTES.signIn, labelKey: 'signIn', guestOnly: true },
      { href: ROUTES.providerRegistration, labelKey: 'joinAsProvider', guestOnly: true },
      { href: ROUTES.consumerRegistration, labelKey: 'createAccount', guestOnly: true },
    ],
  },
  {
    titleKey: 'company',
    links: [{ href: ROUTES.contact, labelKey: 'contact' }],
  },
]

/**
 * Site footer. Public pages only in spirit — auth still shows it so the chrome
 * never jumps when the funnel starts. Links are real routes; prototype columns
 * that pointed at pages we do not have (Blog, Careers) are omitted. Pricing is linked
 * for guests and providers, never for a consumer session — clients never pay us.
 *
 * The session comes from the auth store, which the Header's `getMe()` fills — not from
 * the cookie, as the landing hero does: this renders in the root layout, and a `cookies()`
 * read there would make every route dynamic. The guest-only and provider-only links
 * therefore settle just after hydration, far below the fold. A column left with no links
 * goes with them, so a signed-in footer has no bare Account heading.
 */
export const Footer: FC = () => {
  const t = useTranslations('Footer')
  const isSignedOn = useAuthStore.use.isSignedOn()
  const userType = useAuthStore.use.userType()
  const isConsumer = isSignedOn && userType === USER_TYPES.consumer

  const columns = FOOTER_COLUMNS.map((column) => ({
    ...column,
    links: column.links.filter((link) => !(link.guestOnly && isSignedOn) && !(link.providersOnly && isConsumer)),
  })).filter((column) => column.links.length)

  return (
    <footer className='border-brand-border bg-surface mt-auto border-t'>
      <Container className='py-12 sm:py-16'>
        <div className='grid grid-cols-2 gap-10 md:grid-cols-4 lg:gap-8'>
          <div className='col-span-2 flex flex-col gap-5 md:col-span-1 lg:col-span-1'>
            <BrandLockup size='sm' />
            <AppParagraph size='body-sm' className='max-w-xs'>
              {t('blurb')}
            </AppParagraph>
          </div>

          {columns.map((column) => (
            <div key={column.titleKey} className='flex flex-col gap-4'>
              <AppText as='strong' size='caption' tone='default' className='uppercase tracking-widest'>
                {t(column.titleKey)}
              </AppText>
              <ul className='flex flex-col gap-1'>
                {column.links.map((link) => (
                  <li key={`${column.titleKey}-${link.labelKey}`}>
                    <AppLink href={link.href} variant='plain' className='text-body-sm text-brand-muted hover:text-brand'>
                      {t(link.labelKey)}
                    </AppLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className='border-brand-border mt-12 flex flex-col items-center justify-between gap-3 border-t pt-8 sm:flex-row'>
          {/* The year is passed as a string on purpose: ICU would format a number
              argument per locale and render 2026 as "2,026". */}
          <p className='text-caption m-0'>{t('rights', { year: String(new Date().getFullYear()) })}</p>
          <LanguageSwitcher />
        </div>
      </Container>
    </footer>
  )
}
