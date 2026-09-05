import { PropsWithChildren } from 'react'
import type { Metadata } from 'next'
import { ConsumerSettingsLayoutClient } from './ConsumerSettingsLayoutClient'

export const metadata: Metadata = {
  title: 'Account Settings',
  robots: { index: false, follow: false },
}

export default function ConsumerProfileLayout({ children }: PropsWithChildren) {
  return <ConsumerSettingsLayoutClient>{children}</ConsumerSettingsLayoutClient>
}
