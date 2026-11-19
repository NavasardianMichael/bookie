'use client'

import { FC, useCallback, useMemo } from 'react'
import {
  CalendarOutlined,
  CheckCircleOutlined,
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  MoreOutlined,
  PauseOutlined,
  TagsOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { Button, Dropdown, Switch, Tag } from 'antd'
import dayjs from 'dayjs'
import Image from 'next/image'
import { useLocale, useTranslations } from 'next-intl'
import { DaySchedulePart, ProviderService } from '@store/providers/profile/types'
import { TimeFormat, WeekDay } from '@interfaces/schedule'
import { SCHEDULE_VALUE_FORMAT, WEEK_DAYS_LIST } from '@constants/schedule'
import { WEEKDAY_ORDER } from '@helpers/calendar'
import { cn } from '@helpers/cn'
import { formatDuration, toIsoDuration } from '@helpers/duration'
import { resolveAssetUrl } from '@helpers/images'
import { getTimeDisplayFormat } from '@helpers/timeFormat'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { AppText } from '@components/ui/bare/AppText'
import { AppTime } from '@components/ui/bare/AppTime'
import { AppTitle } from '@components/ui/bare/AppTitle'
import { ClockIcon, CreditCardIcon } from '@components/ui/icons'

type Props = {
  service: ProviderService
  onEdit: (serviceId: string) => void
  onDuplicate: (serviceId: string) => void
  onDelete: (serviceId: string) => void
  /**
   * Opens the confirm dialog for activate/deactivate. The parent owns the write —
   * both the footer switch and the kebab menu item call this, so they share one flow.
   */
  onToggleActive: (serviceId: string) => void
  /**
   * The plan's active-service cap is reached, so an inactive service cannot be switched
   * on and an active one cannot be duplicated. Deactivating stays possible — it is how
   * a provider makes room.
   */
  activationLocked?: boolean
  /** Days in the next three months it is offered on but cannot be booked — outside the provider's hours. */
  outsideHoursDays?: number
  /** Opens the widen / fit choice for the days outside the hours; absent when neither would change anything. */
  onFixHours?: (serviceId: string) => void
  /** The provider's clock, for the service's own hours. */
  timeFormat: TimeFormat
}

const MENU_KEYS = { edit: 'edit', duplicate: 'duplicate', toggle: 'toggle', delete: 'delete' } as const

/** `Mon`, in the active dayjs locale. */
const shortWeekday = (day: WeekDay): string => dayjs().day(WEEKDAY_ORDER[WEEK_DAYS_LIST.indexOf(day)]!).format('ddd')

/**
 * One service, as `manage_services` draws it: icon tile and an overflow menu on
 * the top row, name and clamped description in the body, then a ruled footer
 * carrying duration, price and the active/inactive switch.
 *
 * Activate/deactivate can be started from that switch *or* from an ordinary kebab
 * menu item (the same kind of button as Edit). Duplicate, activate and delete
 * do not write on their own — confirming is the parent's dialog.
 */
export const ProviderServiceCard: FC<Props> = ({
  service,
  onEdit,
  onDuplicate,
  onDelete,
  onToggleActive,
  activationLocked = false,
  outsideHoursDays = 0,
  onFixHours,
  timeFormat,
}) => {
  const t = useTranslations('Services')
  const tSchedule = useTranslations('Settings.availability.schedule')
  const locale = useLocale()
  const resolvedImage = resolveAssetUrl(service.image)
  const hasPrice = typeof service.price === 'number'
  const toggleDisabled = !service.active && activationLocked

  /** One line saying when the service runs, when that is narrower than "whenever you are open". */
  const availabilitySummary = useMemo((): string | null => {
    const { availability } = service
    switch (availability?.mode) {
      case 'weekdays':
        return t('availability.summary.weekdays', {
          days: availability.days.map(shortWeekday).join(', '),
        })
      case 'monthDays':
        return t('availability.summary.monthDays', {
          days: [...availability.days.map(String), ...(availability.lastDay ? [tSchedule('lastDay')] : [])].join(', '),
        })
      case 'dates':
        return t('availability.summary.dates', { count: availability.dates.length })
      default:
        return null
    }
  }, [service, t, tSchedule])

  /** The service's own hours, when it keeps to some inside the provider's — one set, or each weekday's. */
  const hoursSummary = useMemo((): string | null => {
    const display = getTimeDisplayFormat(timeFormat)
    const time = (value: string): string => dayjs(value, SCHEDULE_VALUE_FORMAT).format(display)
    const ranges = (parts: DaySchedulePart[]): string => parts.map((part) => `${time(part.start)}–${time(part.end)}`).join(', ')
    const byDay = service.availability?.mode === 'weekdays' ? service.availability.hoursByDay : undefined
    if (byDay && Object.keys(byDay).length) {
      return WEEK_DAYS_LIST.flatMap((day) => (byDay[day]?.length ? [`${shortWeekday(day)} ${ranges(byDay[day]!)}`] : [])).join(' · ')
    }
    const hours = service.availability?.hours
    return hours?.length ? ranges(hours) : null
  }, [service.availability, timeFormat])

  const handleMenuClick = useCallback(
    ({ key }: { key: string }) => {
      if (key === MENU_KEYS.edit) onEdit(service.id)
      if (key === MENU_KEYS.duplicate) onDuplicate(service.id)
      if (key === MENU_KEYS.toggle) onToggleActive(service.id)
      if (key === MENU_KEYS.delete) onDelete(service.id)
    },
    [onDelete, onDuplicate, onEdit, onToggleActive, service.id]
  )

  /**
   * Controlled: `checked` stays on `service.active` until the parent confirms and
   * the store updates, so a click that only opens the dialog snaps the switch back.
   */
  const handleSwitchChange = useCallback(() => {
    onToggleActive(service.id)
  }, [onToggleActive, service.id])

  const items = useMemo(
    () => [
      { key: MENU_KEYS.edit, icon: <EditOutlined />, label: t('edit') },
      {
        key: MENU_KEYS.duplicate,
        icon: <CopyOutlined />,
        label: t('duplicateService'),
        // An active copy takes a plan slot. An inactive one does not, so it stays available at the cap.
        disabled: service.active && activationLocked,
      },
      {
        key: MENU_KEYS.toggle,
        icon: service.active ? <PauseOutlined /> : <CheckCircleOutlined />,
        label: service.active ? t('deactivateService') : t('activateService'),
        disabled: toggleDisabled,
      },
      { key: MENU_KEYS.delete, icon: <DeleteOutlined />, label: t('deleteService'), danger: true },
    ],
    [activationLocked, service.active, t, toggleDisabled]
  )

  return (
    <li
      className={cn(
        'bg-surface flex min-w-0 flex-col justify-between gap-4 rounded-brand border p-3 transition-shadow sm:p-4',
        service.active ? 'border-brand-border hover:shadow-md' : 'border-brand-border border-dashed'
      )}
    >
      <div className='flex min-w-0 flex-col gap-2'>
        <div className='flex items-start justify-between gap-2'>
          <span
            className={cn(
              'relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-brand-sm',
              service.active ? 'bg-brand-50 text-brand' : 'bg-surface-sunken text-brand-400'
            )}
          >
            {resolvedImage ? (
              <Image src={resolvedImage} alt='' fill sizes='48px' className='object-cover' />
            ) : (
              <TagsOutlined aria-hidden className='text-xl' />
            )}
          </span>

          <Dropdown menu={{ items, onClick: handleMenuClick }} trigger={['click']} placement='bottomRight'>
            <Button
              type='text'
              icon={<MoreOutlined />}
              aria-label={t('actionsFor', { name: service.name })}
              className='min-h-11 min-w-11'
            />
          </Dropdown>
        </div>

        <AppTitle level='h3' className='line-clamp-1'>
          {service.name}
        </AppTitle>

        {service.description ? (
          <AppParagraph size='body-sm' className='m-0 line-clamp-2'>
            {service.description}
          </AppParagraph>
        ) : (
          <AppParagraph size='body-sm' className='m-0 line-clamp-2 italic'>
            {t('noDescription')}
          </AppParagraph>
        )}

        {(availabilitySummary || hoursSummary) && (
          <AppText size='caption' tone='muted' className='flex items-center gap-1.5'>
            <CalendarOutlined aria-hidden />
            <span className='line-clamp-1'>{[availabilitySummary, hoursSummary].filter(Boolean).join(' · ')}</span>
          </AppText>
        )}

        {service.active && outsideHoursDays > 0 && (
          <AppText size='caption' tone='danger' className='flex items-center gap-1.5'>
            <WarningOutlined aria-hidden />
            <span>{t('outsideHours', { count: outsideHoursDays })}</span>
            {onFixHours && (
              <button
                type='button'
                onClick={() => onFixHours(service.id)}
                aria-label={t('outsideHoursFixFor', { name: service.name })}
                className='text-brand hover:text-brand-hover cursor-pointer border-0 bg-transparent p-0 font-semibold underline underline-offset-2'
              >
                {t('outsideHoursFix')}
              </button>
            )}
          </AppText>
        )}
      </div>

      <div className='border-brand-border-subtle flex flex-wrap items-center justify-between gap-3 border-t pt-4'>
        <div className='flex flex-wrap items-center gap-4'>
          <span className='text-brand-text flex items-center gap-1.5 font-semibold'>
            <ClockIcon aria-hidden className='h-4 w-4' />
            <AppTime dateTime={toIsoDuration(service.duration)} className='text-caption'>
              {formatDuration(service.duration, locale)}
            </AppTime>
          </span>

          <span className={cn('flex items-center gap-1.5 font-semibold', !hasPrice && 'text-brand-muted')}>
            <CreditCardIcon aria-hidden className='h-4 w-4' />
            <AppText size='caption' tone={hasPrice ? 'default' : 'muted'} numeric>
              {hasPrice ? `${service.price} ${service.currency ?? ''}`.trim() : t('noPrice')}
            </AppText>
          </span>
        </div>

        <div className='flex items-center gap-2'>
          <Tag color={service.active ? 'success' : undefined} className='m-0 uppercase'>
            {service.active ? t('active') : t('inactive')}
          </Tag>
          <Switch
            checked={service.active}
            onChange={handleSwitchChange}
            disabled={toggleDisabled}
            aria-label={service.active ? t('deactivateService') : t('activateService')}
          />
        </div>
      </div>
    </li>
  )
}
