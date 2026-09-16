import { redirect } from '@i18n/navigation'
import { ROUTES } from '@constants/routes'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ lang: string }>
}

/** Preferred payment methods now live on the Profile tab. */
export default async function ConsumerPaymentsPage({ params }: Props) {
  const { lang } = await params
  redirect({ href: ROUTES.consumerProfile, locale: lang })
}
