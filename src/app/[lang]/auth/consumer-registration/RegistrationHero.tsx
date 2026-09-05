import { FC } from 'react'
import { BrandLockup } from '@components/brand/BrandLockup'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { AppText } from '@components/ui/bare/AppText'
import { AppTitle } from '@components/ui/bare/AppTitle'
import { BellIcon, SpeedIcon } from '@components/ui/icons'

const FEATURES = [
  { Icon: SpeedIcon, title: 'Fast Booking', detail: 'Under 30 seconds' },
  { Icon: BellIcon, title: 'Smart Reminders', detail: 'Never miss an event' },
]

/**
 * The navy marketing panel beside the consumer registration form, hidden below `lg` exactly
 * as the prototype has it — on a phone the form takes the whole screen.
 *
 * Every decoration is inline SVG or CSS: the mockup ships no image file, and a
 * Server Component keeps the panel's copy in the initial HTML.
 */
export const RegistrationHero: FC = () => (
  <aside className='bg-brand relative hidden items-center justify-center overflow-hidden p-12 lg:flex lg:w-1/2'>
    <svg aria-hidden className='pointer-events-none absolute inset-0 h-full w-full opacity-10'>
      <defs>
        <pattern id='registration-hero-grid' width='40' height='40' patternUnits='userSpaceOnUse'>
          <path d='M 40 0 L 0 0 0 40' fill='none' stroke='white' strokeWidth='1' />
        </pattern>
      </defs>
      <rect width='100%' height='100%' fill='url(#registration-hero-grid)' />
    </svg>

    <span
      aria-hidden
      className='pointer-events-none absolute -right-[10%] -bottom-[10%] size-[31.25rem] rounded-full bg-white/5 blur-3xl'
    />

    <div className='relative z-10 flex max-w-lg flex-col'>
      <BrandLockup tone='inverse' className='mb-12' />

      <AppTitle level='h2' size='h1' className='mb-6 text-white'>
        Time is your most valuable asset.
      </AppTitle>

      <AppParagraph className='mb-10 text-lg leading-relaxed font-light text-white/80'>
        Join thousands of people who have simplified their lives by scheduling
        everything&mdash;from haircuts to home repairs&mdash;in one seamless platform.
      </AppParagraph>

      <ul className='grid grid-cols-2 gap-6'>
        {FEATURES.map(({ Icon, title, detail }) => (
          <li key={title} className='rounded-brand border border-white/10 bg-white/10 p-6 backdrop-blur-md'>
            <Icon className='mb-2 h-6 w-6 text-white' />
            <AppText as='strong' className='block font-semibold text-white'>
              {title}
            </AppText>
            <AppText size='body-sm' className='text-white/60'>
              {detail}
            </AppText>
          </li>
        ))}
      </ul>
    </div>
  </aside>
)
