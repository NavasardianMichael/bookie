import { PageShell } from '@components/ui/layout'
import { CardGridSkeleton } from '@components/ui/skeletons/CardGridSkeleton'

const Loading = () => (
  <PageShell as='article' className='flex flex-col gap-8'>
    <div className='flex flex-col gap-2'>
      <div className='bg-surface-sunken h-8 w-56 animate-pulse rounded-brand' />
      <div className='bg-surface-sunken h-4 w-40 animate-pulse rounded-brand' />
    </div>
    <CardGridSkeleton count={6} />
  </PageShell>
)

export default Loading
