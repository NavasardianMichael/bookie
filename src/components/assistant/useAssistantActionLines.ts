'use client'

import { useCallback } from 'react'
import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import { useLocale, useTranslations } from 'next-intl'
import { AssistantAction, AssistantBookingSnapshot } from '@api/assistant/types'
import { DaySchedulePart, ServiceAvailability } from '@store/providers/profile/types'
import { TimeFormat } from '@interfaces/schedule'
import { DAY_KEY_FORMAT, SCHEDULE_VALUE_FORMAT } from '@constants/schedule'
import { formatDuration } from '@helpers/duration'
import { getTimeDisplayFormat } from '@helpers/timeFormat'

dayjs.extend(customParseFormat)

/** One line of a proposal card. `warn` marks a change worth a second look (it moves hours, breaks a link, emails a client). */
export type ActionLine = { text: string; warn?: boolean }

/**
 * Every proposed change in the provider's words, before they approve it — what changes, to
 * what, and for which booking or service. Built from the structured actions, never from the
 * model's own prose, so what the card says is exactly what Apply sends.
 */
export const useAssistantActionLines = (timeFormat: TimeFormat): ((action: AssistantAction) => ActionLine[]) => {
  const t = useTranslations('Assistant.actions')
  const tDays = useTranslations('Settings.availability.days')
  const locale = useLocale()
  const display = getTimeDisplayFormat(timeFormat)

  return useCallback(
    (action) => {
      const time = (value: string): string => dayjs(value, SCHEDULE_VALUE_FORMAT).format(display)
      const ranges = (parts: DaySchedulePart[]): string => parts.map((part) => `${time(part.start)}–${time(part.end)}`).join(', ')
      const day = (dayKey: string): string => dayjs(dayKey, DAY_KEY_FORMAT).format('ddd D MMM')
      const span = (from: string, to: string): string => (from === to ? day(from) : `${day(from)} – ${day(to)}`)
      const booking = (snapshot: AssistantBookingSnapshot | undefined) => ({
        client: snapshot?.client || t('aClient'),
        service: snapshot?.service ?? '',
        when: snapshot ? dayjs(snapshot.start, 'YYYY-MM-DD HH:mm').format(`ddd D MMM, ${display}`) : '',
      })
      const rule = (availability: ServiceAvailability): string => {
        const days =
          availability.mode === 'weekdays'
            ? availability.days.map((d) => tDays(d)).join(', ')
            : availability.mode === 'monthDays'
              ? t('monthDays', { days: availability.days.join(', ') })
              : availability.mode === 'dates'
                ? t('dates', { count: availability.dates.length })
                : t('everyOpenDay')
        return availability.hours?.length ? `${days}, ${ranges(availability.hours)}` : days
      }
      const onOff = (enabled: boolean): string => (enabled ? t('on') : t('off'))

      switch (action.type) {
        case 'setWeeklyHours':
          return action.days.map((entry) => ({
            text: entry.ranges.length
              ? t('weeklyDay', { day: tDays(entry.day), hours: ranges(entry.ranges) })
              : t('weeklyClosed', { day: tDays(entry.day) }),
          }))
        case 'setSpecialDates':
          return action.entries.map((entry) => {
            const dates = span(entry.from, entry.to)
            const kind = entry.kind ?? (entry.ranges.length ? 'open' : 'closed')
            const line =
              kind === 'open'
                ? t('specialHours', { dates, hours: ranges(entry.ranges) })
                : entry.ranges.length
                  ? t('specialClosedHours', { dates, hours: ranges(entry.ranges) })
                  : t('specialClosed', { dates })
            return { text: entry.note ? `${line} (${entry.note})` : line }
          })
        case 'removeSpecialDates':
          return [{ text: t('specialRemove', { dates: action.dates.map(day).join(', ') }) }]
        case 'setOnlineBooking':
          return [{ text: action.enabled ? t('bookingResume') : t('bookingPause') }]
        case 'createService':
          return [
            {
              text: t('serviceCreate', {
                name: action.name,
                duration: formatDuration(action.durationMinutes, locale),
                price: action.price !== undefined ? `${action.price}${action.currency ? ` ${action.currency}` : ''}` : t('noPrice'),
              }),
            },
            ...(action.availability ? [{ text: t('serviceWhen', { when: rule(action.availability) }) }] : []),
          ]
        case 'updateService': {
          const name = action.serviceName ?? t('aService')
          const lines: ActionLine[] = []
          if (action.active === false) lines.push({ text: t('serviceDeactivate', { name }) })
          if (action.active === true) lines.push({ text: t('serviceActivate', { name }) })
          if (action.name) lines.push({ text: t('serviceRename', { name, value: action.name }) })
          if (action.durationMinutes) {
            lines.push({ text: t('serviceDuration', { name, value: formatDuration(action.durationMinutes, locale) }) })
          }
          if (action.price !== undefined) {
            lines.push({
              text:
                action.price === null
                  ? t('servicePriceCleared', { name })
                  : t('servicePrice', { name, value: `${action.price}${action.currency ? ` ${action.currency}` : ''}` }),
            })
          }
          if (action.description) lines.push({ text: t('serviceDescription', { name }) })
          if (action.availability) lines.push({ text: t('serviceAvailability', { name, when: rule(action.availability) }) })
          return lines.length ? lines : [{ text: t('serviceUpdate', { name }) }]
        }
        case 'deleteService':
          return [{ text: t('serviceDelete', { name: action.serviceName ?? t('aService') }), warn: true }]
        case 'updateProfile':
          return [
            ...(action.fullName ? [{ text: t('profileName', { value: action.fullName }) }] : []),
            ...(action.description ? [{ text: t('profileDescription') }] : []),
            ...(action.address ? [{ text: t('profileAddress', { value: action.address }) }] : []),
          ]
        case 'setBookingApproval':
          return [{ text: t('approval', { state: onOff(action.enabled) }) }]
        case 'setNotifications':
          return [
            ...(action.newBooking !== undefined ? [{ text: t('notifyNewBooking', { state: onOff(action.newBooking) }) }] : []),
            ...(action.bookingChanges !== undefined
              ? [{ text: t('notifyChanges', { state: onOff(action.bookingChanges) }) }]
              : []),
            ...(action.appointmentReminders !== undefined
              ? [{ text: t('notifyReminders', { state: onOff(action.appointmentReminders) }) }]
              : []),
            ...(action.appointmentReminderMinutes
              ? [{ text: t('notifyReminderLead', { lead: formatDuration(action.appointmentReminderMinutes, locale) }) }]
              : []),
          ]
        case 'setClock':
          return [
            ...(action.timeZone ? [{ text: t('timeZone', { zone: action.timeZone }), warn: true }] : []),
            ...(action.timeFormat ? [{ text: action.timeFormat === 'h12' ? t('clock12') : t('clock24') }] : []),
          ]
        case 'updateSeo':
          return [
            ...(action.title ? [{ text: t('seoTitle', { value: action.title }) }] : []),
            ...(action.description ? [{ text: t('seoDescription') }] : []),
            ...(action.slug ? [{ text: t('seoSlug', { value: action.slug }), warn: true }] : []),
          ]
        case 'setCategories':
          return [{ text: t('categories', { names: action.names.join(', ') }) }]
        case 'setListed':
          return [{ text: action.enabled ? t('listed') : t('unlisted') }]
        case 'decideBooking':
          return [
            {
              text: action.decision === 'approve' ? t('approve', booking(action.booking)) : t('decline', booking(action.booking)),
              warn: true,
            },
          ]
        case 'cancelBooking':
          return [{ text: t('cancel', booking(action.booking)), warn: true }]
        case 'rescheduleBooking':
          return [
            {
              text: t('reschedule', {
                ...booking(action.booking),
                to: `${day(action.date)}, ${time(action.time)}`,
              }),
              warn: true,
            },
          ]
        case 'setVisitorAssistant':
          return [{ text: t('visitorAssistant', { state: onOff(action.enabled) }) }]
        default:
          return []
      }
    },
    [display, locale, t, tDays]
  )
}
