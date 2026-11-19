'use client'

import { FC, useState } from 'react'
import { CalendarOutlined, CloseCircleOutlined, DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import { useTranslations } from 'next-intl'
import { SpecialDate } from '@store/providers/profile/types'
import { TimeFormat } from '@interfaces/schedule'
import { MAX_SERVICE_EXCEPTIONS } from '@constants/serviceAvailability'
import { splitScheduleIntoParts } from '@helpers/schedule'
import { MAX_SPECIAL_DATES, replaceSpecialDate, upcomingSpecialDates } from '@helpers/specialDates'
import { getTimeDisplayFormat } from '@helpers/timeFormat'
import { dayKeyOf } from '@helpers/timeZone'
import { AppButton } from '@components/ui/AppButton'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { AppText } from '@components/ui/bare/AppText'
import { AppTitle } from '@components/ui/bare/AppTitle'
import { formatDateSpan, formatParts } from './scheduleText'
import { isServiceSection, kindOfSection, SpecialDateSection, SpecialDateSheet } from './SpecialDateSheet'

type Props = {
  section: SpecialDateSection
  /** Every special date, of both kinds — this section shows its own and hands back the whole list. */
  value: SpecialDate[]
  onChange: (next: SpecialDate[]) => void
  timeFormat: TimeFormat
  timeZone?: string
  disabled?: boolean
  /** Inside another titled section (the open dates, under "Your hours"): one heading level down. */
  nested?: boolean
}

/**
 * One section of the Availability tab's dates, listed soonest first, each editable:
 *
 * - **added** — dates on hours of their own, replacing the usual ones that day;
 * - **excluded** — days off, or some hours away on a date;
 * - **openDates** — under the specific-dates rule, the only days open at all.
 *
 * All three are `Provider.specialDates` (open or closed entries), one list that never overlaps,
 * so each section edits its own entries and hands back the whole list. Held in the tab's state
 * and stored with its Save draft / Publish, like the weekly hours.
 *
 * The service form reuses it for a service's own added and excluded dates (`serviceAdded`,
 * `serviceExcluded`) through `ServiceExceptionsField`, which converts its exceptions to and from
 * this shape.
 */
export const SpecialDatesEditor: FC<Props> = ({
  section,
  value,
  onChange,
  timeFormat,
  timeZone,
  disabled = false,
  nested = false,
}) => {
  const t = useTranslations('Settings.availability')
  const tCommon = useTranslations('Common')
  const [editing, setEditing] = useState<{ entry?: SpecialDate } | null>(null)
  const todayKey = dayKeyOf(new Date(), timeZone)
  const upcoming = upcomingSpecialDates(value, todayKey)
  const kind = kindOfSection(section)
  const entries = upcoming.filter((entry) => entry.kind === kind)
  const displayFormat = getTimeDisplayFormat(timeFormat)
  const max = isServiceSection(section) ? MAX_SERVICE_EXCEPTIONS : MAX_SPECIAL_DATES

  const label = (entry: SpecialDate): string => formatDateSpan(entry.from, entry.to)
  const ranges = (entry: SpecialDate): string =>
    entry.hours ? formatParts(splitScheduleIntoParts(entry.hours), displayFormat) : ''
  const describe = (entry: SpecialDate): string => {
    // A service's added date without hours of its own runs on the provider's that day.
    if (entry.kind === 'open') return entry.hours ? ranges(entry) : t('special.usualHours')
    // A service is "not offered" where the provider would be "closed".
    if (isServiceSection(section)) {
      return entry.hours ? t('special.notOfferedDuring', { hours: ranges(entry) }) : t('special.notOffered')
    }
    return entry.hours ? t('special.closedDuring', { hours: ranges(entry) }) : tCommon('closed')
  }

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div className='flex flex-col gap-1'>
          <AppTitle level={nested ? 'h3' : 'h2'} size='h3' className='flex items-center gap-2'>
            {kind === 'closed' ? <CloseCircleOutlined className='text-brand' /> : <CalendarOutlined className='text-brand' />}
            {t(`dates.${section}.title`)}
          </AppTitle>
          <AppParagraph size='body-sm'>{t(`dates.${section}.body`)}</AppParagraph>
        </div>
        <AppButton
          icon={<PlusOutlined />}
          disabled={disabled || upcoming.length >= max}
          onClick={() => setEditing({})}
        >
          {t(`dates.${section}.add`)}
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
                <AppText size='body-sm' tone={entry.kind === 'open' ? 'default' : 'muted'}>
                  {describe(entry)}
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
          {t(`dates.${section}.empty`)}
        </AppText>
      )}

      {editing && (
        <SpecialDateSheet
          open
          section={section}
          entry={editing.entry}
          entries={upcoming}
          timeFormat={timeFormat}
          timeZone={timeZone}
          onClose={() => setEditing(null)}
          onSave={(next) => {
            onChange(replaceSpecialDate(upcoming, next, editing.entry?.from))
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}
