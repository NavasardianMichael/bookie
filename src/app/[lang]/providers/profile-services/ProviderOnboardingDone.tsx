'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@store/auth/store'
import { ROUTE_KEYS, ROUTES } from '@constants/routes'
import { generateEntityPath } from '@helpers/entities'
import { AppLink } from '@components/ui/bare/AppLink'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { Surface } from '@components/ui/layout'

/**
 * The end of provider onboarding.
 *
 * Without this the flow simply stopped here: services could be added forever with no way
 * out and nothing telling the provider they were finished. The destination is their own
 * public profile — the page a client would see, which is the useful thing to check once
 * setup is done.
 *
 * `profileId` comes from the login response, but a refresh clears the store, so it is
 * recovered from the session cookie via `/identity/me`. Until it resolves the link falls
 * back to the explore list rather than rendering a broken URL.
 */
export const ProviderOnboardingDone: React.FC = () => {
  const profileId = useAuthStore.use.profileId()
  const getMe = useAuthStore.use.getMe()

  useEffect(() => {
    if (!profileId) void getMe()
  }, [profileId, getMe])

  return (
    <Surface padding='md' className='flex flex-col items-center gap-3 text-center'>
      <AppParagraph size='body-sm' className='m-0'>
        Finished setting up? Your profile is live — see what clients see.
      </AppParagraph>
      <AppLink
        href={profileId ? generateEntityPath(ROUTE_KEYS.providers, profileId) : ROUTES.providers}
        variant='button'
        tone='primary'
      >
        View my profile
      </AppLink>
    </Surface>
  )
}
