import { useTranslations } from 'next-intl'

export const SkipLink = () => {
  const t = useTranslations('Nav')

  return (
  <a
    href='#main'
    className='bg-surface text-brand-text sr-only rounded-brand shadow-lg focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2'
  >
    {t('skipToContent')}
    </a>
  )
}
