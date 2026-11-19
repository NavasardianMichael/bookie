import { FC } from 'react'
import { useTranslations } from 'next-intl'
import { cn } from '@helpers/cn'
import { AppText } from '@components/ui/bare/AppText'
import { SparkleIcon } from '@components/ui/icons'

type Props = {
  className?: string
}

/**
 * The "AI" mark beside a feature that runs on Google Gemini — the comparison table's AI rows
 * and the cards in `PricingAiFeatures`. antd-free and hook-only, so it renders in the
 * server HTML of `/pricing`.
 */
export const AiBadge: FC<Props> = ({ className }) => {
  const t = useTranslations('Plans')

  return (
    <AppText
      size='overline'
      tone='brand'
      className={cn(
        'bg-brand-50 rounded-brand-sm inline-flex items-center gap-1 px-1.5 py-0.5 align-middle font-bold leading-none',
        className
      )}
    >
      <SparkleIcon className='h-3 w-3 shrink-0' />
      {t('aiBadge')}
    </AppText>
  )
}
