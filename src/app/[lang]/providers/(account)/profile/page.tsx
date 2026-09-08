import { EMAIL_VERIFY_QUERY } from '@constants/auth'
import { ProviderProfileSettingsForm } from './ProviderProfileSettingsForm'

export const dynamic = 'force-dynamic'

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const firstQuery = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value

export default async function ProviderProfileSettingsPage({ searchParams }: Props) {
  const query = await searchParams
  return <ProviderProfileSettingsForm verifyEmailToken={firstQuery(query[EMAIL_VERIFY_QUERY])} />
}
