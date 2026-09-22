import { FC, ReactNode } from 'react'
import { cn } from '@helpers/cn'
import { AppLink } from '@components/ui/bare/AppLink'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { AppText } from '@components/ui/bare/AppText'
import { AppTitle } from '@components/ui/bare/AppTitle'
import { PageShell } from './PageShell'

export type SettingsNavItem = {
  href: string
  /**
   * `ReactNode`, not `string`, so a caller can decorate the label — the Approvals tab
   * wraps it in an antd `Badge` carrying the pending count.
   *
   * The decoration is composed **by the caller**, which is what keeps this file's
   * antd-free contract intact (`src/components/CLAUDE.md`): `ui/layout/` must stay
   * server-renderable, and an antd import here would pull the client runtime into every
   * route that renders a settings shell. A node arrives already built by a `'use client'`
   * island, and this file only places it.
   */
  label: ReactNode
  icon: ReactNode
  /** Exact match for the profile home; prefix for nested tabs. */
  match?: 'exact' | 'prefix'
  /** Extra paths that light this item — sibling views of the same tab. */
  aliases?: string[]
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
  /**
   * Rendered above the panel, on every subpage — the workspace switch lives here.
   *
   * A slot rather than the component itself, for the same reason `label` is a `ReactNode`:
   * this file is antd-free by contract, and the switch is a `'use client'` island. It also
   * keeps the shell reusable by the consumer tree, which passes nothing when the account
   * holds no provider profile.
   */
  contentHeader?: ReactNode
  footer?: ReactNode
  children: ReactNode
  className?: string
}

const pathMatches = (activeHref: string, href: string, match?: 'exact' | 'prefix'): boolean => {
  if (match === 'exact') return activeHref === href
  return activeHref === href || activeHref.startsWith(`${href}/`)
}

const isActive = (item: SettingsNavItem, activeHref: string): boolean =>
  [item.href, ...(item.aliases ?? [])].some((href) => pathMatches(activeHref, href, item.match))

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
  contentHeader,
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

      <div className='min-w-0 flex-1'>
        {contentHeader}
        {children}
      </div>
    </div>
  </PageShell>
)
