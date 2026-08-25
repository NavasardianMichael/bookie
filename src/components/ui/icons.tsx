/**
 * Small inline icon set for Server Components.
 *
 * `@ant-design/icons` pulls in React context and is therefore client-only, so a
 * server-rendered component that imports it fails at build time. Use antd icons
 * inside client components and these anywhere else.
 */

type IconProps = {
  className?: string
}

const base = (className?: string) => ({
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  className: className ?? 'h-4 w-4',
  'aria-hidden': true,
})

export const PhoneIcon = ({ className }: IconProps) => (
  <svg {...base(className)}>
    <path d='M6.6 2.8a1.5 1.5 0 0 1 2.1.5l1.4 2.4a1.5 1.5 0 0 1-.3 1.9l-1.1.9a11 11 0 0 0 4.9 4.9l.9-1.1a1.5 1.5 0 0 1 1.9-.3l2.4 1.4a1.5 1.5 0 0 1 .5 2.1l-1 1.5a3 3 0 0 1-3.4 1.2C10.4 18 6 13.6 4 7.2a3 3 0 0 1 1.2-3.4Z' />
  </svg>
)

export const MapPinIcon = ({ className }: IconProps) => (
  <svg {...base(className)}>
    <path d='M20 10c0 5.5-8 12-8 12s-8-6.5-8-12a8 8 0 0 1 16 0Z' />
    <circle cx='12' cy='10' r='2.8' />
  </svg>
)

export const MailIcon = ({ className }: IconProps) => (
  <svg {...base(className)}>
    <rect x='2.5' y='4.5' width='19' height='15' rx='2.5' />
    <path d='m3.5 6.5 8.5 6 8.5-6' />
  </svg>
)

export const GlobeIcon = ({ className }: IconProps) => (
  <svg {...base(className)}>
    <circle cx='12' cy='12' r='9.2' />
    <path d='M2.8 12h18.4M12 2.8c2.4 2.5 3.6 5.6 3.6 9.2s-1.2 6.7-3.6 9.2c-2.4-2.5-3.6-5.6-3.6-9.2S9.6 5.3 12 2.8Z' />
  </svg>
)

export const InboxIcon = ({ className }: IconProps) => (
  <svg {...base(className ?? 'h-8 w-8')}>
    <path d='M3 13.5 5.2 5a2 2 0 0 1 1.9-1.4h9.8A2 2 0 0 1 18.8 5L21 13.5' />
    <path d='M3 13.5h4.5l1.2 2.4h6.6l1.2-2.4H21v4.4a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.9Z' />
  </svg>
)
