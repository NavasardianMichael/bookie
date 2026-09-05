import { CalendarIcon } from '@components/ui/icons'

/**
 * Decorative schedule frame for the landing hero. Not a live calendar — it has
 * to paint on the server, and the real FullCalendar is a client island.
 */
export const HomeHeroPreview = () => (
  <div className='bg-brand-50 aspect-square w-full rounded-4xl p-6 sm:p-8' aria-hidden='true'>
    <div className='border-brand-border bg-surface flex h-full flex-col gap-4 rounded-2xl border p-5 shadow-xl sm:p-6'>
      <div className='mb-2 flex items-center justify-between'>
        <span className='bg-surface-sunken h-4 w-24 rounded-full' />
        <span className='bg-brand-50 text-brand flex size-8 items-center justify-center rounded-full'>
          <CalendarIcon className='h-4 w-4' />
        </span>
      </div>
      <div className='flex flex-col gap-4'>
        <div className='bg-surface-sunken flex h-12 items-center gap-3 rounded-lg px-4'>
          <span className='size-2 rounded-full bg-green-500' />
          <span className='bg-brand-200 h-3 w-1/2 rounded-full' />
        </div>
        <div className='bg-brand-50 flex h-12 items-center gap-3 rounded-lg px-4'>
          <span className='bg-brand size-2 rounded-full' />
          <span className='bg-brand-300 h-3 w-1/3 rounded-full' />
        </div>
        <div className='bg-surface-sunken flex h-12 items-center gap-3 rounded-lg px-4'>
          <span className='size-2 rounded-full bg-amber-400' />
          <span className='bg-brand-200 h-3 w-2/3 rounded-full' />
        </div>
      </div>
    </div>
  </div>
)
