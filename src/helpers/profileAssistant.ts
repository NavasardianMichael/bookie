import { AssistantCategory, AssistantProposal, AssistantService } from '@api/profileAssistant/types'
import { ProviderProfile, ServiceAvailability, WeekSchedule } from '@store/providers/profile/types'
import { CategoryValue } from '@interfaces/auth'
import { ScheduleDaysForm, TimeFormat } from '@interfaces/schedule'
import { AppointmentReminderLeadMinutes, PaymentInfo,PaymentMethod } from '@interfaces/settings'
import { ASSISTANT_STEPS } from '@constants/profileAssistant'
import { WEEK_DAYS_LIST } from '@constants/schedule'
import { DEFAULT_PROVIDER_NOTIFICATION_PREFS } from '@constants/settings'
import { toPaymentMethods } from '@helpers/payment'
import { dayFormsToWeekSchedule, splitScheduleIntoParts, weekScheduleToDayForms } from '@helpers/schedule'

/**
 * The profile assistant's review, as pure functions: the provider's workspace in the
 * proposal's shape, the proposal as the review form holds it and back, and what differs.
 * `src/components/profileAssistant/` renders it; `tests/unit/helpers/profileAssistant.spec.ts`
 * pins it.
 */

export type AssistantStep = (typeof ASSISTANT_STEPS)[number]

/**
 * The review form. Flat where an existing field component binds a top-level name — the
 * categories field, the reminder switch — and the week as the availability editor holds it.
 * Services are not here: each is edited in its own form and kept beside this one.
 */
export type AssistantReviewValues = {
  fullName: string
  description?: string
  categories: CategoryValue[]
  days: ScheduleDaysForm
  timeZone?: string
  timeFormat?: TimeFormat
  requiresBookingApproval: boolean
  paymentMethods: PaymentMethod[]
  paymentNotes?: string
  appointmentReminders: boolean
  appointmentReminderMinutes: AppointmentReminderLeadMinutes
  bookingChanges: boolean
  newBooking: boolean
  seoTitle?: string
  seoDescription?: string
  slug?: string
}

export type ServiceStatus = 'new' | 'changed' | 'kept'

const orNull = (value: string | undefined | null): string | null => {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

/**
 * What the provider has now, in the proposal's shape — an unpublished draft wins over the live
 * value, as on each settings tab and in the API's own snapshot. Active services only: the
 * assistant leaves inactive ones alone.
 */
export const proposalFromProfile = (profile: ProviderProfile): AssistantProposal => {
  const draft = profile.draft ?? {}
  const paymentInfo: PaymentInfo | undefined =
    draft.paymentInfo === undefined ? profile.details.paymentInfo : (draft.paymentInfo ?? undefined)

  return {
    fullName: draft.fullName ?? profile.basic.fullName,
    description: orNull(draft.description === undefined ? profile.basic.description : draft.description),
    categories: (profile.basic.categories ?? []).map(({ id, name }) => ({ id, name })),
    services: profile.services.allIds
      .map((id) => profile.services.byId[id])
      .filter((service) => service?.active)
      .map((service) => ({
        id: service!.id,
        name: service!.name,
        description: orNull(service!.description),
        duration: service!.duration,
        price: service!.price ?? null,
        currency: orNull(service!.currency),
        availability: service!.availability,
      })),
    weekSchedule: (draft.weekSchedule as WeekSchedule | undefined) ?? profile.details.weekSchedule,
    timeZone: draft.timeZone ?? profile.details.timeZone ?? null,
    timeFormat: draft.timeFormat ?? profile.details.timeFormat ?? null,
    requiresBookingApproval: profile.details.requiresBookingApproval ?? false,
    paymentMethods: toPaymentMethods(paymentInfo),
    paymentNotes: orNull(paymentInfo?.notes),
    notifications: { ...DEFAULT_PROVIDER_NOTIFICATION_PREFS, ...profile.details.emailNotificationPrefs },
    seoTitle: orNull(profile.seo?.title),
    seoDescription: orNull(profile.seo?.description),
    slug: orNull(profile.seo?.slug),
  }
}

/** A proposal as the review form starts from it. */
export const proposalToReviewValues = (proposal: AssistantProposal): AssistantReviewValues => ({
  fullName: proposal.fullName,
  description: proposal.description ?? '',
  categories: proposal.categories.map((category) =>
    category.id ? { id: category.id, name: category.name } : { name: category.name, isNew: true }
  ),
  days: weekScheduleToDayForms(proposal.weekSchedule),
  timeZone: proposal.timeZone ?? undefined,
  timeFormat: proposal.timeFormat ?? undefined,
  requiresBookingApproval: proposal.requiresBookingApproval,
  paymentMethods: proposal.paymentMethods,
  paymentNotes: proposal.paymentNotes ?? '',
  ...proposal.notifications,
  seoTitle: proposal.seoTitle ?? '',
  seoDescription: proposal.seoDescription ?? '',
  slug: proposal.slug ?? '',
})

/** The reviewed form and services back as the proposal `POST /apply` takes. */
export const reviewValuesToProposal = (
  values: AssistantReviewValues,
  services: AssistantService[]
): AssistantProposal => ({
  fullName: values.fullName.trim(),
  description: orNull(values.description),
  categories: (values.categories ?? []).flatMap((category): AssistantCategory[] => {
    if (category.id) return [{ id: category.id, name: category.name }]
    const name = category.name?.trim()
    return name ? [{ id: null, name }] : []
  }),
  services,
  weekSchedule: dayFormsToWeekSchedule(values.days),
  timeZone: values.timeZone ?? null,
  timeFormat: values.timeFormat ?? null,
  requiresBookingApproval: values.requiresBookingApproval,
  paymentMethods: values.paymentMethods ?? [],
  paymentNotes: orNull(values.paymentNotes),
  notifications: {
    appointmentReminders: values.appointmentReminders,
    appointmentReminderMinutes: values.appointmentReminderMinutes,
    bookingChanges: values.bookingChanges,
    newBooking: values.newBooking,
  },
  seoTitle: orNull(values.seoTitle),
  seoDescription: orNull(values.seoDescription),
  slug: orNull(values.slug)?.toLowerCase() ?? null,
})

const sameAvailability = (left: ServiceAvailability, right: ServiceAvailability): boolean =>
  JSON.stringify(left) === JSON.stringify(right)

/** Whether two services say the same thing on the public page. The id is not compared. */
export const isSameService = (left: AssistantService, right: AssistantService): boolean =>
  left.name === right.name &&
  (left.description ?? null) === (right.description ?? null) &&
  left.duration === right.duration &&
  (left.price ?? null) === (right.price ?? null) &&
  (left.currency ?? null) === (right.currency ?? null) &&
  sameAvailability(left.availability, right.availability)

/** New (no id), changed, or kept as it is — against the provider's current services. */
export const serviceStatus = (service: AssistantService, current: readonly AssistantService[]): ServiceStatus => {
  const before = service.id ? current.find((candidate) => candidate.id === service.id) : undefined
  if (!before) return 'new'
  return isSameService(before, service) ? 'kept' : 'changed'
}

/** The current services the review no longer lists — removed on apply, restorable until then. */
export const removedServices = (
  current: readonly AssistantService[],
  services: readonly AssistantService[]
): AssistantService[] => current.filter((service) => !services.some((kept) => kept.id === service.id))

/** A week by its bookable windows, so two spellings of the same hours compare equal. */
const weekKey = (weekSchedule: WeekSchedule | undefined): string =>
  JSON.stringify(
    WEEK_DAYS_LIST.map((day) => {
      const source = weekSchedule?.[day]
      return source
        ? splitScheduleIntoParts({
            availability: { ...source.availability },
            breaks: source.breaks.map((brk) => ({ ...brk })),
          })
        : []
    })
  )

const sameCategories = (left: AssistantProposal['categories'], right: AssistantProposal['categories']): boolean => {
  const key = (categories: AssistantProposal['categories']): string =>
    categories
      .map((category) => category.id ?? `new:${category.name.toLowerCase()}`)
      .sort()
      .join('|')
  return key(left) === key(right)
}

/**
 * The review steps whose content differs between the current workspace and the proposal —
 * marked in the step list, so the provider sees at a glance where the draft changes things.
 */
export const changedSteps = (current: AssistantProposal, proposal: AssistantProposal): Set<AssistantStep> => {
  const changed = new Set<AssistantStep>()
  if (
    current.fullName !== proposal.fullName ||
    current.description !== proposal.description ||
    !sameCategories(current.categories, proposal.categories)
  ) {
    changed.add('profile')
  }
  if (
    current.services.length !== proposal.services.length ||
    proposal.services.some((service) => serviceStatus(service, current.services) !== 'kept')
  ) {
    changed.add('services')
  }
  if (weekKey(current.weekSchedule) !== weekKey(proposal.weekSchedule)) changed.add('availability')
  if (current.requiresBookingApproval !== proposal.requiresBookingApproval) changed.add('approvals')
  if (
    [...current.paymentMethods].sort().join() !== [...proposal.paymentMethods].sort().join() ||
    current.paymentNotes !== proposal.paymentNotes
  ) {
    changed.add('payments')
  }
  if (
    current.seoTitle !== proposal.seoTitle ||
    current.seoDescription !== proposal.seoDescription ||
    current.slug !== proposal.slug
  ) {
    changed.add('seo')
  }
  if (JSON.stringify(current.notifications) !== JSON.stringify(proposal.notifications)) changed.add('notifications')
  if (current.timeZone !== proposal.timeZone || current.timeFormat !== proposal.timeFormat) changed.add('advanced')
  return changed
}

/**
 * Whether applying would put more services on the page than the plan allows. Only growth is
 * refused — a provider already above a cap a downgrade left behind may keep or trim theirs —
 * the API's `exceedsServiceCap`, which has the final say.
 */
export const exceedsServiceCap = (activeBefore: number, activeAfter: number, maxActiveServices: number | null): boolean =>
  maxActiveServices !== null && activeAfter > maxActiveServices && activeAfter > activeBefore
