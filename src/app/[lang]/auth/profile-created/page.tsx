import { Metadata } from 'next'
import { AuthCard } from '@components/ui/layout'
import { ProfileCreatedSuccess } from './ProfileCreatedSuccess'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Profile Created',
  description: 'Your profile has been successfully created!',
}

export default function ProfileCreated() {
  return (
    <AuthCard className='flex-1 items-center justify-center gap-4'>
      <ProfileCreatedSuccess />
    </AuthCard>
  )
}
