import { PageShell } from '@components/ui/layout'

const Loading = () => (
  <PageShell as='article' width='prose' className='flex flex-col gap-6'>
    <div className='flex flex-col gap-4 md:flex-row md:items-start'>
      <div className='bg-surface-sunken aspect-square w-full max-w-xs animate-pulse rounded-brand md:order-last md:w-40' />
      <div className='flex flex-1 flex-col gap-3'>
        <div className='bg-surface-sunken h-8 w-3/4 animate-pulse rounded-brand' />
        <div className='bg-surface-sunken h-4 w-1/2 animate-pulse rounded-brand' />
        <div className='bg-surface-sunken h-20 w-full animate-pulse rounded-brand' />
      </div>
    </div>
    <div className='bg-surface-sunken h-40 w-full animate-pulse rounded-brand' />
  </PageShell>
)

export default Loading
