import { Result } from 'antd'
import { ROUTES } from '@constants/routes'
import AppButton from '@components/ui/AppButton'
import AppLink from '@components/ui/AppLink'
import { PageShell } from '@components/ui/layout'

export default function NotFound() {
  return (
    <PageShell variant='fill' width='prose' className='justify-center'>
      <Result
        status='404'
        title='Page not found'
        subTitle='The page you are looking for does not exist or has moved.'
        extra={[
          <AppLink key='home' href={ROUTES.home} className='no-underline'>
            <AppButton type='primary'>Go home</AppButton>
          </AppLink>,
          <AppLink key='providers' href={ROUTES.providers} className='no-underline'>
            <AppButton>Browse providers</AppButton>
          </AppLink>,
        ]}
      />
    </PageShell>
  )
}
