'use client'

import { FC, useState } from 'react'
import { CalendarOutlined, DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import { useTranslations } from 'next-intl'
import { SpecialDate } from '@store/providers/profile/types'
import { TimeFormat } from '@interfaces/schedule'
import { DAY_KEY_FORMAT, SCHEDULE_VALUE_FORMAT } from '@constants/schedule'
import { splitScheduleIntoParts } from '@helpers/schedule'
import { MAX_SPECIAL_DATES, replaceSpecialDate, upcomingSpecialDates } from '@helpers/specialDates'
import { getTimeDisplayFormat } from '@helpers/timeFormat'
import { dayKeyOf } from '@helpers/timeZone'
import { AppButton } from '@components/ui/AppButton'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { AppText } from '@components/ui/bare/AppText'
import { AppTitle } from '@components/ui/bare/AppTitle'
import { SpecialDateSheet } from './SpecialDateSheet'

dayjs.extend(customParseFormat)

type Props = {
  value: SpecialDate[]
  onChange: (next: SpecialDate[]) => void
  timeFormat: TimeFormat
  timeZone?: string
  disabled?: boolean
}

/**
 * The Availability tab's special dates: days or runs of days that do not follow the weekly
 * hours — closed for a holiday, or open on other hours — listed soonest first, each editable.
 * Held in the tab's state and stored with its Save draft / Publish, like the weekly hours.
 */
export const SpecialDatesEditor: FC<Props> = ({ value, onChange, timeFormat, timeZone, disabled = false }) => {
  const t = useTranslations('Settings.availability')
  const tCommon = useTranslations('Common')
  const [editing, setEditing] = useState<{ entry?: SpecialDate } | null>(null)
  const todayKey = dayKeyOf(new Date(), timeZone)
  const entries = upcomingSpecialDates(value, todayKey)
  const displayFormat = getTimeDisplayFormat(timeFormat)

  const label = (entry: SpecialDate): string => {
    const from = dayjs(entry.from, DAY_KEY_FORMAT)
    if (entry.from === entry.to) return from.format('ddd, D MMM YYYY')
    return `${from.format('D MMM')} – ${dayjs(entry.to, DAY_KEY_FORMAT).format('D MMM YYYY')}`
  }
  const hours = (entry: SpecialDate): string =>
    entry.hours
      ? splitScheduleIntoParts(entry.hours)
          .map(
            (part) =>
              `${dayjs(part.start, SCHEDULE_VALUE_FORMAT).format(displayFormat)}–${dayjs(part.end, SCHEDULE_VALUE_FORMAT).format(displayFormat)}`
          )
          .join(', ')
      : tCommon('closed')

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div className='flex flex-col gap-1'>
          <AppTitle level='h2' size='h3' className='flex items-center gap-2'>
            <CalendarOutlined className='text-brand' />
            {t('special.title')}
          </AppTitle>
          <AppParagraph size='body-sm'>{t('special.body')}</AppParagraph>
        </div>
        <AppButton
          icon={<PlusOutlined />}
          disabled={disabled || entries.length >= MAX_SPECIAL_DATES}
          onClick={() => setEditing({})}
        >
          {t('special.add')}
        </AppButton>
      </div>

      {entries.length ? (
        <ul className='m-0 flex list-none flex-col gap-2 p-0'>
          {entries.map((entry) => (
            <li
              key={entry.from}
              className='border-brand-border bg-surface-sunken flex flex-wrap items-center justify-between gap-2 rounded-brand border p-3'
            >
              <div className='flex min-w-0 flex-col'>
                <AppText className='font-semibold'>{label(entry)}</AppText>
                <AppText size='body-sm' tone={entry.hours ? 'default' : 'muted'}>
                  {hours(entry)}
                  {entry.note ? ` · ${entry.note}` : ''}
                </AppText>
              </div>
              <div className='flex gap-1'>
                <AppButton
                  type='text'
                  icon={<EditOutlined />}
                  aria-label={t('special.edit', { date: label(entry) })}
                  disabled={disabled}
                  onClick={() => setEditing({ entry })}
                />
                <AppButton
                  type='text'
                  danger
                  icon={<DeleteOutlined />}
                  aria-label={t('special.remove', { date: label(entry) })}
                  disabled={disabled}
                  onClick={() => onChange(value.filter((other) => other.from !== entry.from))}
                />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <AppText size='body-sm' tone='muted'>
          {t('special.empty')}
        </AppText>
      )}

      {editing && (
        <SpecialDateSheet
          open
          entry={editing.entry}
          entries={entries}
          timeFormat={timeFormat}
          timeZone={timeZone}
          onClose={() => setEditing(null)}
          onSave={(next) => {
            onChange(replaceSpecialDate(entries, next, editing.entry?.from))
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}
