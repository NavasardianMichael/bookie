'use client'

import { FC, ReactNode, useState } from 'react'
import { ClockCircleOutlined, CompressOutlined, ExpandOutlined, SaveOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import { useTranslations } from 'next-intl'
import { DaySchedulePart, ServiceAvailability } from '@store/providers/profile/types'
import { useErrorToast } from '@hooks/useErrorToast'
import { TimeFormat } from '@interfaces/schedule'
import { DAY_KEY_FORMAT, SCHEDULE_VALUE_FORMAT } from '@constants/schedule'
import { cn } from '@helpers/cn'
import { ServiceConflicts, WeekdayWidening } from '@helpers/scheduleConflicts'
import { getTimeDisplayFormat } from '@helpers/timeFormat'
import { AppButton } from '@components/ui/AppButton'
import { AppSheet } from '@components/ui/AppSheet'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { AppText } from '@components/ui/bare/AppText'

dayjs.extend(customParseFormat)

export type ConflictChoice = 'widen' | 'fit' | 'keep'

type Props = {
  open: boolean
  conflicts: ServiceConflicts
  /** The weekly hours a widening would publish; empty when only special dates are in the way. */
  widening: WeekdayWidening[]
  /** The service as fitted to the hours, or `null` when nothing would be left to book. */
  fitted: ServiceAvailability | null
  original: ServiceAvailability
  timeFormat: TimeFormat
  /** Awaited; a rejection is toasted and the sheet stays open. */
  onChoose: (choice: ConflictChoice) => Promise<void>
  onCancel: () => void
}

/**
 * Asked when a service being saved reaches outside the provider's hours — offered on days they
 * are closed, or at hours past theirs. Three choices, each saying exactly what it changes before
 * it is made:
 *
 * - **Widen my hours** — the weekly days the service needs are opened or stretched, published at
 *   once. Special dates and the service's added dates are never touched: a holiday stays a
 *   holiday. Not offered when the provider's hours follow days of the month or specific days.
 * - **Fit the service** — what it asks for that the provider never gives is taken out of the
 *   service (days, hours, added dates), and nothing it can be booked for (`fitServiceToHours`).
 * - **Save as it is** — nothing else changes; those days simply cannot be booked, and the
 *   service card keeps saying so.
 */
export const ServiceConflictSheet: FC<Props> = ({
  open,
  conflicts,
  widening,
  fitted,
  original,
  timeFormat,
  onChoose,
  onCancel,
}) => {
  const t = useTranslations('Services.conflict')
  const tDays = useTranslations('Settings.availability.days')
  const tSchedule = useTranslations('Settings.availability.schedule')
  const tCommon = useTranslations('Common')
  const toast = useErrorToast()
  const [pending, setPending] = useState<ConflictChoice | null>(null)
  const display = getTimeDisplayFormat(timeFormat)

  const time = (value: string): string => dayjs(value, SCHEDULE_VALUE_FORMAT).format(display)
  const parts = (list: DaySchedulePart[]): string =>
    list.length ? list.map((part) => `${time(part.start)}–${time(part.end)}`).join(', ') : tCommon('closed')
  const day = (dayKey: string): string => dayjs(dayKey, DAY_KEY_FORMAT).format('ddd D MMM')
  const span = (entry: { from: string; to: string }): string =>
    entry.from === entry.to ? day(entry.from) : `${day(entry.from)} – ${day(entry.to)}`

  const choose = async (choice: ConflictChoice): Promise<void> => {
    setPending(choice)
    try {
      await onChoose(choice)
    } catch (error) {
      toast(error, { title: t('failed') })
    } finally {
      setPending(null)
    }
  }

  const same = (a: unknown, b: unknown): boolean => JSON.stringify(a ?? null) === JSON.stringify(b ?? null)

  /** Each thing the fit changes, in the words the service form uses. */
  const fittedSummary = (): string | null => {
    if (!fitted) return null
    const lines: string[] = []
    if (fitted.mode === 'weekdays' && original.mode === 'weekdays' && fitted.days.length !== original.days.length) {
      lines.push(t('fitDays', { days: fitted.days.map((d) => tDays(d)).join(', ') }))
    }
    if (fitted.mode === 'monthDays' && original.mode === 'monthDays' && !same([fitted.days, fitted.lastDay], [original.days, original.lastDay])) {
      const days = [...fitted.days.map(String), ...(fitted.lastDay ? [tSchedule('lastDay')] : [])]
      lines.push(t('fitMonthDays', { days: days.join(', ') }))
    }
    if (fitted.mode === 'dates' && original.mode === 'dates' && fitted.dates.length !== original.dates.length) {
      lines.push(t('fitDates', { count: original.dates.length - fitted.dates.length }))
    }
    if (fitted.hours && !same(fitted.hours, original.hours)) {
      lines.push(t('fitHours', { hours: parts(fitted.hours) }))
    }
    if (fitted.hoursByDay && !same(fitted.hoursByDay, original.hoursByDay)) {
      const byDay = Object.entries(fitted.hoursByDay).map(([d, list]) => `${tDays(d)} ${parts(list ?? [])}`)
      lines.push(t('fitHours', { hours: byDay.join('; ') }))
    }
    if (!same(fitted.exceptions, original.exceptions)) lines.push(t('fitAdded'))
    return lines.length ? lines.join(' · ') : t('fitNothing')
  }

  /** Why widening is not offered: the hours do not follow the week, or only dates are in the way. */
  const widenUnavailable = (): string => {
    if (conflicts.weekly.length) return t('widenOtherRule')
    return conflicts.special.length ? t('widenUnavailable') : t('widenAddedDates')
  }

  const option = (
    choice: ConflictChoice,
    icon: ReactNode,
    title: string,
    body: ReactNode,
    disabledReason?: string
  ): ReactNode => (
    <div
      className={cn(
        'border-brand-border flex flex-col gap-2 rounded-brand border p-4',
        disabledReason ? 'border-dashed' : 'bg-surface-sunken'
      )}
    >
      <div className='flex items-center gap-2'>
        <span aria-hidden className='text-brand'>
          {icon}
        </span>
        <AppText className='font-semibold'>{title}</AppText>
      </div>
      <AppText size='body-sm' tone='muted' className='block'>
        {disabledReason ?? body}
      </AppText>
      <AppButton
        className='self-start'
        type={choice === 'keep' ? 'default' : 'primary'}
        disabled={!!disabledReason || (pending !== null && pending !== choice)}
        loading={pending === choice}
        onClick={() => void choose(choice)}
      >
        {t(`choose.${choice}`)}
      </AppButton>
    </div>
  )

  return (
    <AppSheet open={open} onClose={onCancel} title={t('title')} pending={pending !== null}>
      <div className='flex flex-col gap-4'>
        <AppParagraph size='body-sm'>{t('body')}</AppParagraph>

        <ul className='m-0 flex list-none flex-col gap-2 p-0'>
          {conflicts.weekly.map((conflict) => (
            <li key={`${conflict.day}-${conflict.reason}`} className='flex items-start gap-2'>
              <ClockCircleOutlined aria-hidden className='text-brand-warning mt-1' />
              <AppText size='body-sm'>
                {t(`weekly.${conflict.reason}`, { day: tDays(conflict.day), count: conflict.dates.length })}
              </AppText>
            </li>
          ))}
          {conflicts.special.map((conflict) => (
            <li key={`${conflict.entry.from}-${conflict.reason}`} className='flex items-start gap-2'>
              <ClockCircleOutlined aria-hidden className='text-brand-warning mt-1' />
              <AppText size='body-sm'>
                {t(`special.${conflict.reason}`, { dates: span(conflict.entry) })}
                {conflict.entry.note ? ` (${conflict.entry.note})` : ''}
              </AppText>
            </li>
          ))}
          {conflicts.added.map((conflict) => (
            <li key={`added-${conflict.entry.from}-${conflict.reason}`} className='flex items-start gap-2'>
              <ClockCircleOutlined aria-hidden className='text-brand-warning mt-1' />
              <AppText size='body-sm'>{t(`added.${conflict.reason}`, { dates: span(conflict.entry) })}</AppText>
            </li>
          ))}
        </ul>

        {option(
          'widen',
          <ExpandOutlined />,
          t('widenTitle'),
          <span className='flex flex-col gap-1'>
            {widening.map((change) => (
              <span key={change.day}>
                {t('widenLine', { day: tDays(change.day), before: parts(change.before), after: parts(change.after) })}
              </span>
            ))}
            <span>{conflicts.special.length || conflicts.added.length ? t('widenKeepsSpecial') : t('widenLive')}</span>
          </span>,
          widening.length ? undefined : widenUnavailable()
        )}

        {option('fit', <CompressOutlined />, t('fitTitle'), fittedSummary(), fitted ? undefined : t('fitUnavailable'))}

        {option('keep', <SaveOutlined />, t('keepTitle'), t('keepBody'))}
      </div>
    </AppSheet>
  )
}
