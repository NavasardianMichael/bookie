import { useCallback } from 'react'
import dayjs from 'dayjs'
import { useLocale } from 'next-intl'
import { patchAppointmentStatusAPI, patchBookingDecisionAPI, rescheduleProviderBookingAPI } from '@api/appointments/main'
import { putVisitorAssistantAPI } from '@api/assistant/main'
import { AssistantAction, AssistantActionOutcome } from '@api/assistant/types'
import {
  deleteProviderServiceAPI,
  getProviderProfileAPI,
  patchProviderScheduleAPI,
  patchProviderSeoAPI,
  postProviderServiceAPI,
  putProviderCategoriesAPI,
  putProviderProfileAPI,
  putProviderServiceAPI,
} from '@api/providers/main'
import { ProviderServiceRequestPayload } from '@api/providers/types'
import { ProviderProfile, ProviderService } from '@store/providers/profile/types'
import { DAY_KEY_FORMAT } from '@constants/schedule'
import { isScheduleAction, toSchedulePatch } from '@helpers/assistant'
import { processError } from '@helpers/error'
import { zonedTimeToDate } from '@helpers/timeZone'

/** Minutes since midnight of an `'HH:mm'`. */
const minutesOf = (time: string): number => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5))

const serviceBody = (
  action: Extract<AssistantAction, { type: 'createService' | 'updateService' }>
): ProviderServiceRequestPayload => ({
  ...('name' in action && action.name !== undefined ? { name: action.name } : {}),
  ...('durationMinutes' in action && action.durationMinutes !== undefined ? { duration: action.durationMinutes } : {}),
  ...('price' in action && action.price !== undefined ? { price: action.price ?? '' } : {}),
  ...('currency' in action && action.currency !== undefined ? { currency: action.currency } : {}),
  ...('description' in action && action.description !== undefined ? { description: action.description } : {}),
  ...('active' in action && action.active !== undefined ? { active: action.active } : {}),
  ...(action.availability ? { availability: action.availability as ProviderService['availability'] } : {}),
})

/**
 * Applies an approved proposal — **only ever called from the provider's Apply click** — through
 * the very calls the settings tabs make, so each change meets the same validation, plan gates
 * and client emails as one made by hand. Schedule changes go out together as one live write
 * (`toSchedulePatch`); everything else one call per change, in order, each failure kept to its
 * own change. Resolves to one outcome per action, never rejects for a change that failed.
 */
export const useApplyAssistantProposal = (): ((actions: readonly AssistantAction[]) => Promise<AssistantActionOutcome[]>) => {
  const locale = useLocale()

  return useCallback(
    async (actions) => {
      // Read fresh: the ids, the zone and the notification prefs the changes build on.
      const profile: ProviderProfile = await getProviderProfileAPI()
      const timeZone = profile.details.timeZone
      const outcomes = new Map<AssistantAction, AssistantActionOutcome>()
      const run = async (action: AssistantAction, call: () => Promise<unknown>): Promise<void> => {
        try {
          await call()
          outcomes.set(action, { type: action.type, ok: true })
        } catch (error) {
          outcomes.set(action, { type: action.type, ok: false, code: processError(error).code })
        }
      }

      const scheduleActions = actions.filter(isScheduleAction)
      const schedulePatch = toSchedulePatch(scheduleActions)
      if (schedulePatch) {
        try {
          await patchProviderScheduleAPI(schedulePatch)
          scheduleActions.forEach((action) => outcomes.set(action, { type: action.type, ok: true }))
        } catch (error) {
          const code = processError(error).code
          scheduleActions.forEach((action) => outcomes.set(action, { type: action.type, ok: false, code }))
        }
      }

      for (const action of actions) {
        if (isScheduleAction(action)) continue
        switch (action.type) {
          case 'createService':
            await run(action, () =>
              postProviderServiceAPI({ providerId: profile.id, service: { ...serviceBody(action), active: true } })
            )
            break
          case 'updateService':
            await run(action, () =>
              putProviderServiceAPI({ providerId: profile.id, serviceId: action.serviceId, service: serviceBody(action) })
            )
            break
          case 'deleteService':
            await run(action, () => deleteProviderServiceAPI({ providerId: profile.id, serviceId: action.serviceId }))
            break
          case 'updateProfile':
            await run(action, () =>
              putProviderProfileAPI({
                ...(action.fullName ? { fullName: action.fullName } : {}),
                ...(action.description ? { description: action.description } : {}),
                ...(action.address ? { address: action.address } : {}),
              })
            )
            break
          case 'setBookingApproval':
            await run(action, () => putProviderProfileAPI({ requiresBookingApproval: action.enabled }))
            break
          case 'setNotifications': {
            const { type: _type, ...changes } = action
            await run(action, () =>
              putProviderProfileAPI({
                emailNotificationPrefs: {
                  ...profile.details.emailNotificationPrefs!,
                  ...changes,
                } as NonNullable<ProviderProfile['details']['emailNotificationPrefs']>,
              })
            )
            break
          }
          case 'updateSeo':
            await run(action, () =>
              patchProviderSeoAPI({
                ...(action.title ? { seoTitle: action.title } : {}),
                ...(action.description ? { seoDescription: action.description } : {}),
                ...(action.slug ? { slug: action.slug } : {}),
              })
            )
            break
          case 'setCategories':
            await run(action, () => putProviderCategoriesAPI({ categories: action.names.map((name) => ({ name })) }))
            break
          case 'setListed':
            await run(action, () => putProviderProfileAPI({ mode: 'listing', listed: action.enabled }))
            break
          case 'decideBooking':
            await run(action, () => patchBookingDecisionAPI({ id: action.bookingId, decision: action.decision, locale }))
            break
          case 'cancelBooking':
            await run(action, () => patchAppointmentStatusAPI({ id: action.bookingId, status: 'cancelled' }))
            break
          case 'rescheduleBooking': {
            const startAt = timeZone
              ? zonedTimeToDate(action.date, minutesOf(action.time), timeZone)
              : dayjs(action.date, DAY_KEY_FORMAT).startOf('day').add(minutesOf(action.time), 'minute').toDate()
            await run(action, () =>
              rescheduleProviderBookingAPI({ id: action.bookingId, startAt: startAt.toISOString(), locale })
            )
            break
          }
          case 'setVisitorAssistant':
            await run(action, () => putVisitorAssistantAPI({ enabled: action.enabled }))
            break
          default:
            break
        }
      }

      return actions.map((action) => outcomes.get(action) ?? { type: action.type, ok: false })
    },
    [locale]
  )
}
