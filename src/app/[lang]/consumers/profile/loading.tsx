import { PageShell } from '@components/ui/layout'

/** Skeleton matching the settings shell so the handoff costs no layout shift. */
export default function ConsumerProfileLoading() {
  return (
    <PageShell width='wide' className='flex flex-col gap-8 lg:flex-row'>
      <div className='bg-brand-100 h-64 w-full animate-pulse rounded-brand lg:w-64' />
      <div className='bg-brand-100 min-h-96 flex-1 animate-pulse rounded-brand' />
    </PageShell>
  )
}
