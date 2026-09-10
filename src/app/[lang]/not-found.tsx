import { Result } from 'antd'
import { getTranslations } from 'next-intl/server'
import { ROUTES } from '@constants/routes'
import { AppLink } from '@components/ui/bare/AppLink'
import { PageShell } from '@components/ui/layout'

export default async function NotFound() {
  const [t, tCommon, tHome] = await Promise.all([
    getTranslations('Errors'),
    getTranslations('Common'),
    getTranslations('Home'),
  ])

  return (
    <PageShell variant='fill' width='prose' className='justify-center'>
      <Result
        status='404'
        title={t('notFoundTitle')}
        subTitle={t('notFoundBody')}
        extra={[
          <AppLink key='home' href={ROUTES.home} variant='button' tone='primary'>
            {tCommon('goHome')}
          </AppLink>,
          <AppLink key='providers' href={ROUTES.providers} variant='button'>
            {tHome('browseProviders')}
          </AppLink>,
        ]}
      />
    </PageShell>
  )
}
