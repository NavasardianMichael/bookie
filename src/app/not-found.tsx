import { Result } from 'antd'
import { ROUTES } from '@constants/routes'
import { AppLink } from '@components/ui/bare/AppLink'
import { PageShell } from '@components/ui/layout'

export default function NotFound() {
  return (
    <PageShell variant='fill' width='prose' className='justify-center'>
      <Result
        status='404'
        title='Page not found'
        subTitle='The page you are looking for does not exist or has moved.'
        extra={[
          <AppLink key='home' href={ROUTES.home} variant='button' tone='primary'>
            Go home
          </AppLink>,
          <AppLink key='providers' href={ROUTES.providers} variant='button'>
            Browse providers
          </AppLink>,
        ]}
      />
    </PageShell>
  )
}
