'use client'

import { FC, ReactNode } from 'react'
import { Checkbox } from 'antd'
import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import { useTranslations } from 'next-intl'
import { DaySchedulePart, ProviderScheduleRule, SpecialDate } from '@store/providers/profile/types'
import { TimeFormat } from '@interfaces/schedule'
import { ROUTES } from '@constants/routes'
import { DAY_KEY_FORMAT } from '@constants/schedule'
import { splitScheduleIntoParts } from '@helpers/schedule'
import { HoursChange, ServiceLoss } from '@helpers/scheduleChanges'
import { ScheduleImpact } from '@helpers/scheduleConflicts'
import { addDaysToDayKey } from '@helpers/serviceAvailability'
import { getTimeDisplayFormat } from '@helpers/timeFormat'
import { dayKeyOf, inTimeZone } from '@helpers/timeZone'
import { AppConfirmModal } from '@components/ui/AppConfirmModal'
import { AppLink } from '@components/ui/bare/AppLink'
import { AppText } from '@components/ui/bare/AppText'
import { formatDateSpan, formatParts } from './scheduleText'

dayjs.extend(customParseFormat)

type Props = {
  impact: ScheduleImpact | null
  timeZone?: string
  timeFormat: TimeFormat
  /** Awaited by the dialog — go ahead anyway. */
  onConfirm: () => Promise<void>
  onCancel: () => void
  /** The question and its buttons, where the change is not a Publish (the assistant's Apply). */
  copy?: { title: string; confirm: string; cancel: string }
  /**
   * Offer to fit the services the new hours narrow (`impact.fits`) in the same step. The caller
   * owns the choice and saves the fitted services after the hours go live.
   */
  narrow?: { checked: boolean; onChange: (checked: boolean) => void }
}

/** Lines of one list named in full before it folds into "and N more". */
const SHOWN_LINES = 6

/** One titled section of the dialog. */
const Section: FC<{ title: string; children: ReactNode }> = ({ title, children }) => (
  <div>
    <AppText size='body-sm' className='block font-semibold'>
      {title}
    </AppText>
    {children}
  </div>
)

/**
 * What publishing these hours (or applying an assistant's proposal) changes, and what already
 * depends on them — so the provider approves the exact change, not a summary of it:
 *
 * - every change: how the hours repeat, each weekday's hours before → after, each special date
 *   added, changed or removed (`hoursChanges`);
 * - services that can no longer be booked at all, and those that lose some times — each with
 *   exactly which (`serviceLosses`: "Wednesday, every week · 12:00–17:00", a date, all day);
 * - upcoming bookings left outside the hours.
 *
 * With `narrow`, the provider may also fit those services to the new hours — what can be booked
 * stays the same, the services just stop asking for days the provider will not have.
 *
 * Nothing is cancelled or changed — the provider decides whether to go ahead, and reaches each
 * booking from `/bookings` if they want to move it.
 */
export const ScheduleImpactModal: FC<Props> = ({ impact, timeZone, timeFormat, onConfirm, onCancel, copy, narrow }) => {
  const t = useTranslations('Settings.availability.impact')
  const tAvailability = useTranslations('Settings.availability')
  const tCommon = useTranslations('Common')
  const format = getTimeDisplayFormat(timeFormat)
  const todayKey = dayKeyOf(new Date(), timeZone)

  const hours = (parts: readonly DaySchedulePart[]): string => (parts.length ? formatParts(parts, format) : tCommon('closed'))

  const ruleText = (rule: ProviderScheduleRule): string => {
    if (rule.mode === 'dates') return tAvailability('schedule.patterns.dates')
    if (rule.mode === 'weekdays') return tAvailability('schedule.recurrences.weekdays')
    const days = [...rule.days.map(String), ...(rule.lastDay ? [tAvailability('schedule.lastDay')] : [])].join(', ')
    return `${tAvailability('schedule.recurrences.monthDays')} (${days}) · ${hours(splitScheduleIntoParts(rule.hours))}`
  }

  const entryText = (entry: SpecialDate): string => {
    const parts = entry.hours ? splitScheduleIntoParts(entry.hours) : []
    const what =
      entry.kind === 'open'
        ? hours(parts)
        : parts.length
          ? tAvailability('special.closedDuring', { hours: formatParts(parts, format) })
          : tCommon('closed')
    return entry.note ? `${what} · ${entry.note}` : what
  }

  const changeText = (change: HoursChange): string => {
    switch (change.kind) {
      case 'rule':
        return t('fromTo', {
          label: tAvailability('schedule.patternLabel'),
          before: ruleText(change.before),
          after: ruleText(change.after),
        })
      case 'weekday':
        return t('fromTo', {
          label: tAvailability(`days.${change.day}`),
          before: hours(change.before),
          after: hours(change.after),
        })
      case 'specialAdded':
        return t('added', { date: formatDateSpan(change.entry.from, change.entry.to), what: entryText(change.entry) })
      case 'specialRemoved':
        return t('removed', { date: formatDateSpan(change.entry.from, change.entry.to), what: entryText(change.entry) })
      case 'specialChanged':
        return t('fromTo', {
          label: formatDateSpan(change.after.from, change.after.to),
          before: entryText(change.before),
          after: entryText(change.after),
        })
    }
  }

  const lossText = (loss: ServiceLoss): string => {
    const what = loss.parts ? formatParts(loss.parts, format) : tAvailability('special.allDay')
    if (loss.kind === 'date') return `${dayjs(loss.dayKey, DAY_KEY_FORMAT).format('ddd, D MMM')} · ${what}`
    const day = tAvailability(`days.${loss.day}`)
    // From this week on reads as plain "every week"; a later start names its first date.
    const when =
      loss.from < addDaysToDayKey(todayKey, 7)
        ? t('weekly', { day })
        : t('weeklyFrom', { day, date: dayjs(loss.from, DAY_KEY_FORMAT).format('D MMM') })
    return `${when} · ${what}`
  }

  /** A bulleted list, folded after `SHOWN_LINES`. */
  const lines = (items: string[]): ReactNode => (
    <>
      <ul className='m-0 list-disc ps-5'>
        {items.slice(0, SHOWN_LINES).map((item, index) => (
          <li key={index}>
            <AppText size='body-sm'>{item}</AppText>
          </li>
        ))}
      </ul>
      {items.length > SHOWN_LINES && (
        <AppText size='body-sm' tone='muted'>
          {t('andMore', { count: items.length - SHOWN_LINES })}
        </AppText>
      )}
    </>
  )

  return (
    <AppConfirmModal
      open={impact !== null}
      tone='warning'
      title={copy?.title ?? t('title')}
      description={t('body')}
      okText={copy?.confirm ?? t('publishAnyway')}
      cancelText={copy?.cancel ?? t('keepEditing')}
      onConfirm={onConfirm}
      onCancel={onCancel}
    >
      {impact && (
        // A long change (a new rule, many dates) scrolls here rather than pushing the buttons away.
        <div className='mt-3 flex max-h-[60dvh] flex-col gap-3 overflow-y-auto'>
          {impact.changes.length > 0 && <Section title={t('changes')}>{lines(impact.changes.map(changeText))}</Section>}
          {impact.unbookable.length > 0 && (
            <Section title={t('unbookable')}>
              <AppText size='body-sm' tone='muted' className='block'>
                {impact.unbookable.join(', ')}
              </AppText>
            </Section>
          )}
          {impact.narrowed.length > 0 && (
            <Section title={t('narrowed')}>
              <div className='flex flex-col gap-2'>
                {impact.narrowed.map((service) => (
                  <div key={service.name}>
                    <AppText size='body-sm' className='block font-medium'>
                      {service.name}
                    </AppText>
                    {lines(service.losses.map(lossText))}
                  </div>
                ))}
              </div>
              {narrow && impact.fits.length > 0 && (
                <div className='bg-surface-sunken rounded-brand mt-3 flex flex-col gap-1 p-3'>
                  <Checkbox checked={narrow.checked} onChange={(event) => narrow.onChange(event.target.checked)}>
                    {t('narrowFit', { services: impact.fits.map((fit) => fit.name).join(', ') })}
                  </Checkbox>
                  <AppText size='body-sm' tone='muted' className='block ps-6'>
                    {t('narrowFitHelp')}
                  </AppText>
                </div>
              )}
            </Section>
          )}
          {impact.bookingsOutside.length > 0 && (
            <Section title={t('bookingsOutside', { count: impact.bookingsOutside.length })}>
              {lines(
                impact.bookingsOutside.map(
                  (booking) =>
                    `${inTimeZone(booking.start, timeZone).format(`ddd D MMM, ${format}`)} · ${booking.serviceName} · ${booking.clientName}`
                )
              )}
              <AppText size='body-sm' tone='muted' className='mt-1 block'>
                {t.rich('bookingsKept', { link: (chunks) => <AppLink href={ROUTES.bookings}>{chunks}</AppLink> })}
              </AppText>
            </Section>
          )}
        </div>
      )}
    </AppConfirmModal>
  )
}
