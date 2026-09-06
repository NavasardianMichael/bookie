import { FC, ReactNode } from 'react'
import { cn } from '@helpers/cn'
import { AppLink } from '@components/ui/bare/AppLink'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { AppText } from '@components/ui/bare/AppText'
import { AppTitle } from '@components/ui/bare/AppTitle'
import { PageShell } from './PageShell'

export type SettingsNavItem = {
  href: string
  label: string
  icon: ReactNode
  /** Exact match for the profile home; prefix for nested tabs. */
  match?: 'exact' | 'prefix'
}

export type SettingsShellProps = {
  title: string
  subtitle?: string
  /** Small role / account label under the title in the sidebar. */
  accountLabel?: string
  /** Display name at the top of the sidebar (consumer mockup). */
  displayName?: string
  items: SettingsNavItem[]
  activeHref: string
  footer?: ReactNode
  children: ReactNode
  className?: string
}

const isActive = (item: SettingsNavItem, activeHref: string): boolean => {
  if (item.match === 'exact') return activeHref === item.href
  return activeHref === item.href || activeHref.startsWith(`${item.href}/`)
}

/**
 * Settings layout: left nav + right panel. Matches the prototype sidebar + bento
 * main column without cloning the mockup's extra header/footer chrome.
 */
export const SettingsShell: FC<SettingsShellProps> = ({
  title,
  subtitle,
  accountLabel,
  displayName,
  items,
  activeHref,
  footer,
  children,
  className,
}) => (
  <PageShell width='wide' className={cn('flex flex-col gap-8', className)}>
    <div className='flex flex-col gap-8 lg:flex-row lg:items-start'>
      <aside className='flex w-full shrink-0 flex-col gap-6 lg:w-64'>
        <div className='flex flex-col gap-1 px-1'>
          {displayName ? (
            <>
              <AppTitle level='h2' size='h3'>
                {displayName}
              </AppTitle>
              {accountLabel && (
                <AppText size='overline' tone='muted' className='uppercase tracking-wider'>
                  {accountLabel}
                </AppText>
              )}
            </>
          ) : (
            <>
              <AppTitle level='h1' size='h2'>
                {title}
              </AppTitle>
              {subtitle && <AppParagraph size='body-sm'>{subtitle}</AppParagraph>}
            </>
          )}
        </div>

        <nav aria-label={title} className='flex flex-col gap-1'>
          {items.map((item) => {
            const active = isActive(item, activeHref)
            return (
              <AppLink
                key={item.href}
                href={item.href}
                variant='unstyled'
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-brand-sm px-3 py-2.5 text-body-sm font-semibold',
                  active
                    ? 'bg-brand-50 text-brand border-s-4 border-brand'
                    : 'text-brand-muted hover:bg-brand-50 border-s-4 border-transparent'
                )}
              >
                <span className='shrink-0' aria-hidden>
                  {item.icon}
                </span>
                {item.label}
              </AppLink>
            )
          })}
        </nav>

        {footer && <div className='mt-auto border-t border-brand-border pt-4'>{footer}</div>}
      </aside>

      <div className='min-w-0 flex-1'>{children}</div>
    </div>
  </PageShell>
)
