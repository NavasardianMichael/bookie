import { FC } from 'react'
import { cn } from '@helpers/cn'
import { generateGoogleMapsLink } from '@helpers/location'
import AppLink from './bare/AppLink'
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
 * Server-safe: real anchors styled as buttons, no antd Button — so the tel: and
 * mailto: hrefs are in the markup a crawler reads, not added at hydration.
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
        <AppLink
          key={key}
          href={href}
          variant='button'
          target={key === 'website' || key === 'directions' ? '_blank' : undefined}
          className='flex-1 basis-24 px-3'
        >
          <span aria-hidden='true'>{icon}</span>
          {label}
        </AppLink>
      ))}
    </div>
  )
}

export default ContactActions
