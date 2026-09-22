'use client'

import { FC } from 'react'
import { SwapOutlined } from '@ant-design/icons'
import { useTranslations } from 'next-intl'
import { counterpartPath, WorkspaceRole } from '@helpers/workspace'
import { AppLink } from '@components/ui/bare/AppLink'
import { AppText } from '@components/ui/bare/AppText'

type Props = {
  /** The tree currently on screen, not the session's role — they differ after a switch. */
  current: WorkspaceRole
  /** Locale-free pathname, so the counterpart table can match `ROUTES` entries directly. */
  pathname: string
}

/**
 * Moves between the two halves of one account.
 *
 * It sits above the panel on **every** settings subpage rather than on the one screen
 * that used to have it. The old control lived in the Bookings page header and swapped
 * between two provider-tree URLs; this is the same gesture generalised — the person is
 * the same, the hat is not.
 *
 * It **navigates and does not re-authenticate**. A session carries one role, resolved
 * provider-first at login, and nothing here changes it: the API scopes the consumer
 * profile to `session.userId`, so a provider opening their own consumer settings is
 * reading their own record under the session they already hold.
 *
 * Rendered only when the account actually holds the other profile. A provider who has
 * never booked anyone has no Consumer row, and offering to open a record that does not
 * exist would land on a 404 — `GET /identity/me` reports `profiles` for exactly this.
 */
export const WorkspaceSwitch: FC<Props> = ({ current, pathname }) => {
  const t = useTranslations('Settings.workspace')
  const target: WorkspaceRole = current === 'provider' ? 'consumer' : 'provider'

  return (
    <div className='border-brand-border bg-brand-50 mb-6 flex flex-wrap items-center justify-between gap-3 rounded-brand border p-4'>
      <div className='min-w-0'>
        <AppText size='body-sm' className='block font-semibold'>
          {t(current === 'provider' ? 'onProviderTitle' : 'onConsumerTitle')}
        </AppText>
        <AppText size='caption' tone='muted' className='block'>
          {t(current === 'provider' ? 'onProviderBody' : 'onConsumerBody')}
        </AppText>
      </div>

      {/* A real link, not a button: the destination is a URL, so it prefetches, opens in
          a new tab on middle-click, and needs no client handler to work. */}
      <AppLink
        href={counterpartPath(pathname, target)}
        variant='button'
        tone='primary'
        className='h-auto min-h-8 shrink-0 whitespace-normal py-2 text-center'
      >
        <SwapOutlined aria-hidden />
        {t(target === 'consumer' ? 'toConsumer' : 'toProvider')}
      </AppLink>
    </div>
  )
}
