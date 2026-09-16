import { getTranslations } from 'next-intl/server'
import { ROUTES } from '@constants/routes'
import { AppLink } from '@components/ui/bare/AppLink'
import { PageHeader, PageShell } from '@components/ui/layout'

/**
 * Invalid or unknown manage token. Same antd-free shell as the locale 404, with
 * copy that names a booking rather than a missing page.
 */
export default async function BookingManageNotFound() {
  const [t, tCommon] = await Promise.all([getTranslations('Booking'), getTranslations('Common')])

  return (
    <PageShell variant='fill' width='prose' className='justify-center'>
      <PageHeader
        align='center'
        title={t('manageNotFoundTitle')}
        subtitle={t('manageNotFoundBody')}
        actions={
          <AppLink href={ROUTES.home} variant='button' tone='primary'>
            {tCommon('goHome')}
          </AppLink>
        }
      />
    </PageShell>
  )
}
