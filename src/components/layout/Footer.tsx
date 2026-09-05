import { FC } from 'react'
import { useTranslations } from 'next-intl'
import { ROUTES } from '@constants/routes'
import { BrandLockup } from '@components/brand/BrandLockup'
import { AppLink } from '@components/ui/bare/AppLink'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { AppText } from '@components/ui/bare/AppText'
import { Container } from '@components/ui/layout/Container'
import { LanguageSwitcher } from './LanguageSwitcher'

/** Keys into the `Footer` message namespace, not copy — see src/i18n/CLAUDE.md. */
const FOOTER_COLUMNS: { titleKey: string; links: { href: string; labelKey: string }[] }[] = [
  {
    titleKey: 'platform',
    links: [
      { href: ROUTES.providers, labelKey: 'findProvider' },
      { href: ROUTES.categories, labelKey: 'categories' },
      { href: ROUTES.organizations, labelKey: 'organizations' },
    ],
  },
  {
    titleKey: 'account',
    links: [
      { href: ROUTES.phoneNumberInput, labelKey: 'signIn' },
      { href: ROUTES.providerRegistration, labelKey: 'joinAsProvider' },
      { href: ROUTES.consumerRegistration, labelKey: 'createAccount' },
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
 * that pointed at pages we do not have (Pricing, Blog, Careers) are omitted.
 */
export const Footer: FC = () => {
  const t = useTranslations('Footer')

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

          {FOOTER_COLUMNS.map((column) => (
            <div key={column.titleKey} className='flex flex-col gap-4'>
              <AppText as='strong' size='caption' tone='default' className='uppercase tracking-widest'>
                {t(column.titleKey)}
              </AppText>
              <ul className='flex flex-col gap-3'>
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
