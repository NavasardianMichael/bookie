import { PLAN_SWITCH_QUERY } from '@constants/plans'
import { toPlan } from '@helpers/plans'
import { ProviderPlanClient } from './ProviderPlanClient'

export const dynamic = 'force-dynamic'

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

/**
 * `?switch=<plan>` (`PLAN_SWITCH_QUERY`) is how `/pricing` hands over a click on a cheaper
 * plan: read here, on the server, because `next/navigation` is a grep gate and
 * `@i18n/navigation` has no `useSearchParams`.
 */
export default async function ProviderPlanPage({ searchParams }: Props) {
  const query = await searchParams
  return <ProviderPlanClient switchRequest={toPlan(query[PLAN_SWITCH_QUERY])} />
}
