import { PageShell } from '@components/ui/layout'
import { CardGridSkeleton } from '@components/ui/skeletons/CardGridSkeleton'

const Loading = () => (
  <PageShell className='flex flex-col gap-6'>
    <div className='flex flex-col gap-2'>
      <div className='bg-surface-sunken h-8 w-48 animate-pulse rounded-brand' />
      <div className='bg-surface-sunken h-4 w-32 animate-pulse rounded-brand' />
    </div>
    <CardGridSkeleton count={8} />
  </PageShell>
)

export default Loading
