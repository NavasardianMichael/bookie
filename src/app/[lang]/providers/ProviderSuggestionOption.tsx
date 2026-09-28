import { FC } from 'react'
import { BasicProvider } from '@store/providers/list/types'
import { AppAvatar } from '@components/ui/AppAvatar'
import { AppText } from '@components/ui/bare/AppText'

type Props = {
  provider: BasicProvider
  /** Composed once by the caller, which also needs it for the option's accessible name. */
  name: string
}

/**
 * One row of the search box's dropdown. The second line is the organization, or failing
 * that the first category — enough to tell two providers with the same name apart.
 */
export const ProviderSuggestionOption: FC<Props> = ({ provider, name }) => {
  const { basic } = provider
  const subtitle = basic.organization?.basic.name ?? basic.categories?.[0]?.name

  // `leading-snug` on both lines is what fits five rows inside antd's default list height;
  // at the scale's own leading the fifth row sits behind a scrollbar.
  return (
    <span className='flex items-center gap-3'>
      <AppAvatar src={basic.image} name={name} size={32} />
      <span className='flex min-w-0 flex-col'>
        <AppText as='strong' size='body-sm' className='truncate leading-snug'>
          {name}
        </AppText>
        {subtitle && (
          <AppText size='caption' tone='muted' className='truncate leading-snug'>
            {subtitle}
          </AppText>
        )}
      </span>
    </span>
  )
}
