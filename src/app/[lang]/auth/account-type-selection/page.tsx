import { Metadata } from 'next'
import { ROUTES } from '@constants/routes'
import { AppLink } from '@components/ui/bare/AppLink'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { AppText } from '@components/ui/bare/AppText'
import { AppTitle } from '@components/ui/bare/AppTitle'
import { BuildingIcon, UserIcon } from '@components/ui/icons'
import { AuthCard } from '@components/ui/layout'

export const metadata: Metadata = {
  title: 'Account Type Selection',
  description:
    'Select your account type, either Service Provider or Client (Service Consumer), to continue with the sign-on process.',
}

/**
 * Consumer and provider registration are different forms on different routes, so the role
 * is decided by which one you open — exactly as the prototypes have it. That makes this
 * screen two links rather than a form: there is no selection state to hold, and therefore
 * no way for the control and the form store to disagree about what is selected.
 */
const ACCOUNT_TYPES = [
  {
    href: ROUTES.consumerRegistration,
    title: 'Book services',
    description: 'Find local professionals and reserve a time in seconds.',
    Icon: UserIcon,
  },
  {
    href: ROUTES.providerRegistration,
    title: 'Offer services',
    description: 'Publish what you do and manage your booking calendar.',
    Icon: BuildingIcon,
  },
]

export default function AccountTypeSelection() {
  return (
    <AuthCard className='gap-8'>
      <div className='flex flex-col gap-2 text-center'>
        <AppTitle level='h1'>Join Bookie</AppTitle>
        <AppParagraph>Choose how you want to get started.</AppParagraph>
      </div>

      <ul className='flex flex-col gap-3'>
        {ACCOUNT_TYPES.map(({ href, title, description, Icon }) => (
          <li key={href}>
            <AppLink
              href={href}
              variant='plain'
              className='border-brand-border hover:border-brand active:bg-brand-50 rounded-brand flex items-center gap-4 border-2 p-4 no-underline transition-colors hover:no-underline'
            >
              <span className='bg-brand-50 text-brand rounded-brand-sm flex size-11 shrink-0 items-center justify-center'>
                <Icon className='h-5 w-5' />
              </span>
              <span className='flex flex-col gap-0.5'>
                <AppText as='strong' tone='default'>
                  {title}
                </AppText>
                <AppText size='body-sm' tone='muted'>
                  {description}
                </AppText>
              </span>
            </AppLink>
          </li>
        ))}
      </ul>

      <AppParagraph size='body-sm' className='text-center'>
        Already have an account?{' '}
        <AppLink href={ROUTES.phoneNumberInput} className='text-brand font-bold'>
          Sign In
        </AppLink>
      </AppParagraph>
    </AuthCard>
  )
}
