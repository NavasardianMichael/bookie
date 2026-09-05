'use client'

import Image from 'next/image'
import profileVerifiedImage from '@assets/images/verified_icon.png'
import { useAuthStore } from '@store/auth/store'
import { UserType } from '@interfaces/auth'
import { USER_TYPES } from '@constants/auth'
import { ROUTES } from '@constants/routes'
import { AppLink } from '@components/ui/bare/AppLink'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { AppTitle } from '@components/ui/bare/AppTitle'

type Destination = {
  href: string
  label: string
  description: string
}

/**
 * The terminal step of registration, and the point where the two flows finally diverge.
 *
 * This screen used to hard-code the provider destination, so every consumer who signed up
 * was handed a "Configure Your Profile" button into the provider profile form. The role now
 * comes from the login response the store recorded.
 */
const DESTINATIONS: Record<UserType, Destination> = {
  [USER_TYPES.provider]: {
    href: ROUTES.providerProfileCreation,
    label: 'Configure Your Profile',
    description: "You're all set — next, tell clients what you do.",
  },
  [USER_TYPES.consumer]: {
    href: ROUTES.providers,
    label: 'Explore Providers',
    description: "You're all set — let's find you an appointment.",
  },
}

export const ProfileCreatedSuccess: React.FC = () => {
  const userType = useAuthStore.use.userType()

  // Falls back to the consumer route rather than the provider form: sending a consumer into
  // provider onboarding is the failure this screen exists to fix.
  const destination = DESTINATIONS[userType ?? USER_TYPES.consumer]

  return (
    <>
      <Image priority src={profileVerifiedImage} alt='Profile Verified' width={96} />
      <div className='flex flex-col items-center gap-2'>
        <AppTitle level='h1' size='h1' className='text-center'>
          Success!
        </AppTitle>
        <AppParagraph size='body-sm' className='text-center'>
          {destination.description}
        </AppParagraph>
      </div>
      <AppLink href={destination.href} variant='button' tone='primary' block>
        {destination.label}
      </AppLink>
    </>
  )
}
