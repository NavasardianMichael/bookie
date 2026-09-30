import { Container, ResponsiveGrid, Surface } from '@components/ui/layout'

const FEATURE_PLACEHOLDERS = 6

export default function Loading() {
  return (
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
      {/* Mirrors `HomeAudienceFeatures`, the first block below the hero. */}
      <Container className='py-16 md:py-24'>
        <div className='mb-10 flex max-w-2xl flex-col gap-3 md:mb-12'>
          <div className='bg-surface-sunken h-3 w-24 animate-pulse rounded-full' />
          <div className='bg-surface-sunken h-10 w-full max-w-lg animate-pulse rounded-brand' />
          <div className='bg-surface-sunken h-6 w-full max-w-md animate-pulse rounded-brand' />
        </div>
        <ResponsiveGrid>
          {Array.from({ length: FEATURE_PLACEHOLDERS }, (_, index) => (
            <Surface key={index} className='flex flex-col gap-3'>
              <div className='bg-brand-50 size-10 animate-pulse rounded-xl' />
              <div className='bg-surface-sunken h-5 w-2/3 animate-pulse rounded-full' />
              <div className='bg-surface-sunken h-10 w-full animate-pulse rounded-brand-sm' />
            </Surface>
          ))}
        </ResponsiveGrid>
      </Container>
    </div>
  )
}
