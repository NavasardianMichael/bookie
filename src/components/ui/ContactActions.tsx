import { FC } from 'react'
import { cn } from '@helpers/cn'
import { generateGoogleMapsLink } from '@helpers/location'
import { GlobeIcon, MailIcon, MapPinIcon, PhoneIcon } from './icons'

export type ContactActionsProps = {
  phone?: string
  address?: string
  email?: string
  website?: string
  className?: string
}

type Action = {
  key: string
  href: string
  label: string
  icon: React.ReactNode
}

/**
 * Turns the stacked label/value blocks the detail pages used into a single row of
 * high-intent actions, which is both far shorter and directly tappable.
 *
 * Server-safe: plain anchors, no antd Button.
 */
const ContactActions: FC<ContactActionsProps> = ({ phone, address, email, website, className }) => {
  const actions: Action[] = [
    phone && { key: 'call', href: `tel:${phone}`, label: 'Call', icon: <PhoneIcon /> },
    address && {
      key: 'directions',
      href: generateGoogleMapsLink(address),
      label: 'Directions',
      icon: <MapPinIcon />,
    },
    email && { key: 'email', href: `mailto:${email}`, label: 'Email', icon: <MailIcon /> },
    website && { key: 'website', href: website, label: 'Website', icon: <GlobeIcon /> },
  ].filter(Boolean) as Action[]

  if (!actions.length) return null

  return (
    <div className={cn('flex w-full flex-wrap gap-2', className)}>
      {actions.map(({ key, href, label, icon }) => (
        <a
          key={key}
          href={href}
          {...(key === 'website' || key === 'directions'
            ? { target: '_blank', rel: 'noopener noreferrer' }
            : undefined)}
          className='border-brand-border text-brand-text hover:border-brand hover:bg-brand-50 active:bg-brand-100 flex min-h-11 flex-1 basis-24 items-center justify-center gap-2 rounded-brand border px-3 text-body-sm font-medium no-underline transition-colors'
        >
          <span aria-hidden='true'>{icon}</span>
          {label}
        </a>
      ))}
    </div>
  )
}

export default ContactActions
