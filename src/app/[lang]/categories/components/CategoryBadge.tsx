import { FC } from 'react'
import { ROUTE_KEYS } from '@constants/routes'
import { generateEntityPath } from '@helpers/entities'
import { AppLink } from '@components/ui/bare/AppLink'

type Props = {
  id: string
  name: string
}

/** Compact category chip on provider/organization cards — a real link to that category. */
export const CategoryBadge: FC<Props> = ({ id, name }) => (
  <AppLink
    href={generateEntityPath(ROUTE_KEYS.categories, id)}
    variant='unstyled'
    className='border-brand-border text-brand-muted hover:border-brand hover:text-brand rounded-brand border px-1.5 py-0.5 text-caption'
  >
    {name}
  </AppLink>
)
