import { PageShell } from '@components/ui/layout'

export default function Loading() {
  return (
    <PageShell width='form' className='flex flex-col gap-6'>
      <div className='flex flex-col gap-2'>
        <div className='bg-surface-sunken h-8 w-48 animate-pulse rounded-brand' />
        <div className='bg-surface-sunken h-4 w-64 animate-pulse rounded-brand' />
      </div>
      <div className='flex flex-col gap-3'>
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className='bg-surface-sunken h-24 w-full animate-pulse rounded-brand' />
        ))}
      </div>
    </PageShell>
  )
}
