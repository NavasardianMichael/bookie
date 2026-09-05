import type { Metadata } from 'next'
import { ProviderSettingsLayoutClient } from './ProviderSettingsLayoutClient'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function ProviderAccountLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <ProviderSettingsLayoutClient>{children}</ProviderSettingsLayoutClient>
}
