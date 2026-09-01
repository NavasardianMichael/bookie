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

export const CalendarIcon = ({ className }: IconProps) => (
  <svg {...base(className)}>
    <rect x='3' y='5' width='18' height='16' rx='2' />
    <path d='M3 10h18M8 3v4M16 3v4' />
  </svg>
)

export const BellIcon = ({ className }: IconProps) => (
  <svg {...base(className)}>
    <path d='M6 9a6 6 0 1 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9Z' />
    <path d='M10 21a2 2 0 0 0 4 0' />
  </svg>
)

export const ScissorsIcon = ({ className }: IconProps) => (
  <svg {...base(className)}>
    <circle cx='6' cy='6' r='2.5' />
    <circle cx='6' cy='18' r='2.5' />
    <path d='M8.2 7.6 20 18M8.2 16.4 20 6' />
  </svg>
)

export const HeartPulseIcon = ({ className }: IconProps) => (
  <svg {...base(className)}>
    <path d='M3.5 12h3l2-4 3 8 2-4h7' />
    <path d='M19.4 8.2A4.5 4.5 0 0 0 12 7.4a4.5 4.5 0 0 0-7.4 4.8c0 5.2 7.4 9.3 7.4 9.3s2.4-1.3 4.5-3.5' />
  </svg>
)

export const SparkleIcon = ({ className }: IconProps) => (
  <svg {...base(className)}>
    <path d='M12 3.5 13.6 9 19 10.6 13.6 12.2 12 17.5 10.4 12.2 5 10.6 10.4 9Z' />
  </svg>
)

export const BuildingIcon = ({ className }: IconProps) => (
  <svg {...base(className)}>
    <path d='M4 21V5.5A1.5 1.5 0 0 1 5.5 4h9A1.5 1.5 0 0 1 16 5.5V21' />
    <path d='M16 10h3.5A1.5 1.5 0 0 1 21 11.5V21' />
    <path d='M9 21v-4h4v4M8 8h2M12 8h2M8 12h2M12 12h2' />
  </svg>
)

export const CheckCircleIcon = ({ className }: IconProps) => (
  <svg {...base(className)}>
    <circle cx='12' cy='12' r='9' />
    <path d='m8.5 12 2.3 2.3 4.7-4.8' />
  </svg>
)

export const ClockIcon = ({ className }: IconProps) => (
  <svg {...base(className)}>
    <circle cx='12' cy='12' r='9' />
    <path d='M12 7v5.2l3.2 1.8' />
  </svg>
)

export const InboxIcon = ({ className }: IconProps) => (
  <svg {...base(className ?? 'h-8 w-8')}>
    <path d='M3 13.5 5.2 5a2 2 0 0 1 1.9-1.4h9.8A2 2 0 0 1 18.8 5L21 13.5' />
    <path d='M3 13.5h4.5l1.2 2.4h6.6l1.2-2.4H21v4.4a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.9Z' />
  </svg>
)
