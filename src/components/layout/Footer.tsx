import { FC } from 'react'
import { ROUTES } from '@constants/routes'
import { BrandLockup } from '@components/brand/BrandLockup'
import { AppLink } from '@components/ui/bare/AppLink'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { AppText } from '@components/ui/bare/AppText'
import { Container } from '@components/ui/layout/Container'

const FOOTER_COLUMNS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: 'Platform',
    links: [
      { href: ROUTES.providers, label: 'Find a provider' },
      { href: ROUTES.categories, label: 'Categories' },
      { href: ROUTES.organizations, label: 'Organizations' },
    ],
  },
  {
    title: 'Account',
    links: [
      { href: ROUTES.accountTypeSelection, label: 'Sign in' },
      { href: ROUTES.accountTypeSelection, label: 'Join as a provider' },
    ],
  },
  {
    title: 'Company',
    links: [{ href: ROUTES.contact, label: 'Contact' }],
  },
]

/**
 * Site footer. Public pages only in spirit — auth still shows it so the chrome
 * never jumps when the funnel starts. Links are real routes; prototype columns
 * that pointed at pages we do not have (Pricing, Blog, Careers) are omitted.
 */
export const Footer: FC = () => (
  <footer className='border-brand-border bg-surface mt-auto border-t'>
    <Container className='py-12 sm:py-16'>
      <div className='grid grid-cols-2 gap-10 md:grid-cols-4 lg:gap-8'>
        <div className='col-span-2 flex flex-col gap-5 md:col-span-1 lg:col-span-1'>
          <BrandLockup size='sm' />
          <AppParagraph size='body-sm' className='max-w-xs'>
            A single platform to find local services or run a booking calendar.
          </AppParagraph>
        </div>

        {FOOTER_COLUMNS.map((column) => (
          <div key={column.title} className='flex flex-col gap-4'>
            <AppText as='strong' size='caption' tone='default' className='uppercase tracking-widest'>
              {column.title}
            </AppText>
            <ul className='flex flex-col gap-3'>
              {column.links.map((link) => (
                <li key={`${column.title}-${link.label}`}>
                  <AppLink href={link.href} variant='plain' className='text-body-sm text-brand-muted hover:text-brand'>
                    {link.label}
                  </AppLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className='border-brand-border mt-12 flex flex-col items-center justify-between gap-3 border-t pt-8 sm:flex-row'>
        <p className='text-caption m-0'>© {new Date().getFullYear()} Bookie. All rights reserved.</p>
      </div>
    </Container>
  </footer>
)
