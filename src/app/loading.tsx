import { Container } from '@components/ui/layout'
import { CardGridSkeleton } from '@components/ui/skeletons/CardGridSkeleton'

const Loading = () => (
  <div className='flex flex-col'>
    <Container className='flex flex-col gap-12 py-12 md:py-20 lg:flex-row lg:items-center'>
      <div className='flex flex-1 flex-col gap-4'>
        <div className='bg-surface-sunken h-4 w-48 animate-pulse rounded-full' />
        <div className='bg-surface-sunken h-16 w-full max-w-xl animate-pulse rounded-brand' />
        <div className='bg-surface-sunken h-20 w-full max-w-md animate-pulse rounded-brand' />
        <div className='flex gap-3'>
          <div className='bg-surface-sunken h-14 w-44 animate-pulse rounded-brand-sm' />
          <div className='bg-surface-sunken h-14 w-44 animate-pulse rounded-brand-sm' />
        </div>
      </div>
      <div className='bg-brand-50 aspect-square w-full flex-1 animate-pulse rounded-4xl' />
    </Container>
    <Container className='pb-16'>
      <CardGridSkeleton count={6} />
    </Container>
  </div>
)

export default Loading
