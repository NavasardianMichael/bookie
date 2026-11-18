import { AssistantAction, AssistantActionOutcome, AssistantActionType, AssistantProposalStatus } from '@api/assistant/types'
import { PatchProviderSchedulePayload } from '@api/providers/types'
import { DaySchedule, ProviderScheduleRule, SpecialDate, WeekSchedule } from '@store/providers/profile/types'
import { ROUTES } from '@constants/routes'
import { rangesToDaySchedule } from './schedule'
import { applySpecialDateChange } from './specialDates'

/**
 * The provider AI assistant's pure rules: where each proposed change is made by hand, how a
 * proposal's schedule changes become one request, and what an apply's results add up to.
 * The apply itself is `src/hooks/useApplyAssistantProposal.ts`. Server half:
 * `server/src/services/assistant.ts`.
 */

/** The settings page where the provider makes this change themselves — the card's "Adjust myself". */
export const assistantActionRoute = (type: AssistantActionType): string => {
  switch (type) {
    case 'setWeeklyHours':
    case 'setSpecialDates':
    case 'removeSpecialDates':
    case 'setOnlineBooking':
      return ROUTES.providerProfileAvailability
    case 'createService':
    case 'updateService':
    case 'deleteService':
      return ROUTES.providerServices
    case 'setBookingApproval':
    case 'decideBooking':
      return ROUTES.providerProfileApprovals
    case 'setNotifications':
      return ROUTES.providerProfileNotifications
    case 'setClock':
    case 'setVisitorAssistant':
      return ROUTES.providerProfileAdvanced
    case 'updateSeo':
      return ROUTES.providerProfileSeo
    case 'cancelBooking':
    case 'rescheduleBooking':
      return ROUTES.bookings
    default:
      return ROUTES.providerProfile
  }
}

/** A provider's live hours, as the impact check reads them. */
export type LiveHours = { weekSchedule: WeekSchedule; specialDates: SpecialDate[]; rule?: ProviderScheduleRule }

/**
 * The live hours once `patch` is written, for the impact check before Apply — or `null` when the
 * patch leaves the hours alone (pausing bookings or the clock only).
 */
export const hoursAfterSchedulePatch = (before: LiveHours, patch: PatchProviderSchedulePayload): LiveHours | null => {
  if (!patch.weekSchedule && !patch.specialDates && !patch.scheduleRule) return null
  return {
    rule: patch.scheduleRule ?? before.rule,
    weekSchedule: { ...before.weekSchedule, ...patch.weekSchedule } as WeekSchedule,
    specialDates: patch.specialDates
      ? applySpecialDateChange(before.specialDates, patch.specialDates)
      : before.specialDates,
  }
}

/** The kinds of change that go out together, as one schedule write. */
export const SCHEDULE_ACTION_TYPES: readonly AssistantActionType[] = [
  'setWeeklyHours',
  'setSpecialDates',
  'removeSpecialDates',
  'setOnlineBooking',
  'setClock',
]

export const isScheduleAction = (action: AssistantAction): boolean => SCHEDULE_ACTION_TYPES.includes(action.type)

/**
 * Every schedule change in a proposal as one `PATCH /provider-profile/schedule` body — one
 * request, so the hours never land half-changed. `null` when the proposal has none.
 */
export const toSchedulePatch = (actions: readonly AssistantAction[]): PatchProviderSchedulePayload | null => {
  const patch: PatchProviderSchedulePayload = {}
  for (const action of actions) {
    switch (action.type) {
      case 'setWeeklyHours': {
        const week: Record<string, DaySchedule> = { ...(patch.weekSchedule as Record<string, DaySchedule> | undefined) }
        for (const day of action.days) week[day.day] = rangesToDaySchedule(day.ranges)
        patch.weekSchedule = week
        break
      }
      case 'setSpecialDates':
        patch.specialDates = {
          ...patch.specialDates,
          set: [
            ...(patch.specialDates?.set ?? []),
            ...action.entries.map((entry) => {
              const hours = entry.ranges.length ? rangesToDaySchedule(entry.ranges) : null
              // Before `kind` existed, empty ranges were closed and any ranges were the day's hours.
              const kind = entry.kind ?? (hours ? 'open' : 'closed')
              return { from: entry.from, to: entry.to, kind, hours, ...(entry.note ? { note: entry.note } : {}) }
            }),
          ],
        }
        break
      case 'removeSpecialDates':
        patch.specialDates = { ...patch.specialDates, remove: [...(patch.specialDates?.remove ?? []), ...action.dates] }
        break
      case 'setOnlineBooking':
        patch.available = action.enabled
        break
      case 'setClock':
        if (action.timeZone) patch.timeZone = action.timeZone
        if (action.timeFormat) patch.timeFormat = action.timeFormat
        break
      default:
        break
    }
  }
  return Object.keys(patch).length ? patch : null
}

/**
 * What an apply's results add up to: every change made is `applied`; some is `partial`;
 * none is `null` — nothing happened, so the proposal stays pending and can be tried again.
 */
export const proposalStatusFrom = (
  outcomes: readonly AssistantActionOutcome[]
): Exclude<AssistantProposalStatus, 'pending' | 'dismissed'> | null => {
  const made = outcomes.filter((outcome) => outcome.ok).length
  if (!made) return null
  return made === outcomes.length ? 'applied' : 'partial'
}

/** Whether a proposal reaches a client — the card says so before Apply. */
export const emailsClients = (actions: readonly AssistantAction[]): boolean =>
  actions.some((action) => action.type === 'cancelBooking' || action.type === 'rescheduleBooking' || action.type === 'decideBooking')
