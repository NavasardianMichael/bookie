import { redirect } from '@i18n/navigation'
import { ROUTES } from '@constants/routes'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ lang: string }>
}

/** Phone now lives on the Profile tab, same as the provider account. */
export default async function ConsumerPhonePage({ params }: Props) {
  const { lang } = await params
  redirect({ href: ROUTES.consumerProfile, locale: lang })
}
