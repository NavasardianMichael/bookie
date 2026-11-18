import {
  DeleteProviderServiceAPI,
  PostProviderServiceAPI,
  PutProviderProfileAPI,
  PutProviderServiceAPI,
} from '@api/providers/types'
import { BasicCategory } from '@store/categories/single/types'
import { BasicOrganization } from '@store/organizations/single/types'
import { Location, PhoneNumber } from '@interfaces/app'
import { OnlineBooking } from '@interfaces/booking'
import { Normalized } from '@interfaces/commons'
import { ProviderPlan } from '@interfaces/plans'
import { TimeFormat, WeekDay } from '@interfaces/schedule'
import { PaymentInfo, ProviderDraft, ProviderEmailNotificationPrefs } from '@interfaces/settings'
import { StateCommonProps } from '@interfaces/store'

export type ProviderProfileState = StateCommonProps & ProviderProfile

export type ProviderProfile = {
  id: string
  basic: {
    fullName: string
    description?: string
    image?: string
    categories?: BasicCategory[]
    organization?: BasicOrganization
    available: boolean
    /**
     * Hours on today's weekday, same predicate as Explore's `openToday` filter.
     * On `basic` so the card can tell Available from Closed without pulling
     * `weekSchedule`. Optional for payloads written before the field existed.
     */
    openToday?: boolean
    /**
     * On `basic` so the Explore card gets it for free — `BasicProvider` is
     * `Pick<ProviderProfile, 'id' | 'basic'>`.
     *
     * Optional because a payload written before the aggregate columns existed has no
     * `rating` key, and a card that renders `undefined` stars is better than one that
     * throws. `ProviderRating` carries no `score`: the Bayesian ranking input is not
     * published, since showing a shrunk 4.09 next to "1 review" would read as the
     * rating itself.
     */
    rating?: ProviderRating
  }
  details: {
    location: Location
    phone?: PhoneNumber
    country?: string
    /**
     * Identity email (`User.email`). On both the public and owner payloads — it is the
     * only email a provider has, and the public page shows it. Changing it goes through
     * `/identity/change-email`, never `PUT /provider-profile`.
     */
    email?: string
    emailVerifiedAt?: string
    gallery: GalleryItem[]
    weekSchedule: WeekSchedule
    /**
     * Dates that do not follow `weekSchedule` — closed, or open on hours of their own — still
     * ahead. On the **public** payload: the booking grid and the hours list follow them.
     * Optional so a payload from before the column parses; missing is none.
     */
    specialDates?: SpecialDate[]
    /**
     * The base of the hours: weekly (`weekSchedule`), days of the month at one set of hours, or
     * specific dates only (the open `specialDates`). On the **public** payload, like
     * `specialDates`. Optional so a payload from before the column parses; missing is weekly.
     */
    scheduleRule?: ProviderScheduleRule
    /**
     * The IANA zone `weekSchedule` is written in (`Asia/Yerevan`). On the **public** payload:
     * the booking grid steps the hours into instants in this zone and labels its times with
     * it (`@helpers/timeZone`). Absent for a provider who never set one — read the hours in
     * the viewer's zone then, which is all the page ever did before the field existed.
     */
    timeZone?: string
    /**
     * 12- or 24-hour, for every time printed for this provider. On the **public** payload, like
     * `timeZone`. Absent for a provider who never chose — format through
     * `@helpers/timeFormat#resolveTimeFormat`, which falls back to the reader's locale.
     */
    timeFormat?: TimeFormat
    /**
     * Whether the booking page offers a time-zone list and a 12/24-hour switch, together.
     * On the **public** payload. Optional so a payload from before the column parses;
     * treat a missing value as shown, which is what the API defaults it to.
     */
    showClockChoices?: boolean
    emailNotificationPrefs?: ProviderEmailNotificationPrefs
    paymentInfo?: PaymentInfo
    /**
     * The provider reviews every booking before it reaches their calendar.
     *
     * On `details` and therefore on the **public** payload, because the booking sheet
     * has to tell a visitor their submission is a request rather than a confirmation.
     * Optional so a payload written before the column existed still parses; treat a
     * missing value as `false`, which is what the API defaults it to.
     */
    requiresBookingApproval?: boolean
    /**
     * Whether `phone` is published on the public profile. On the **owner** payload only —
     * the public mapper omits a hidden number rather than sending this flag. Optional so
     * a payload written before the column existed still parses; treat a missing value as
     * `true`, which is what the API defaults it to.
     */
    phoneVisible?: boolean
    /**
     * Whether the public page offers its calendar: `paused` when the provider switched
     * `available` off, `full` when their monthly booking allowance is spent. Plan-neutral
     * on purpose — it is on the **public** payload, and a visitor sees the same "contact
     * the provider" either way. Optional so an older payload parses; treat a missing
     * value as `open`.
     */
    onlineBooking?: OnlineBooking
    /**
     * Whether the public page shows its "Booking page by Bookie" line — on Free, off from
     * Basic up. Plan-neutral like `onlineBooking`. Optional so an older payload parses;
     * treat a missing value as `false`, never adding branding a provider paid to remove.
     */
    showPoweredBy?: boolean
    /**
     * Whether the public page offers its AI assistant — switched on by the provider and allowed
     * by their plan. Plan-neutral like `showPoweredBy`. Missing is off.
     */
    visitorAssistant?: boolean
  }
  services: Normalized<ProviderService>
  personal: ProviderPersonalValues
  listed?: boolean
  draft?: ProviderDraft | null
  seo?: ProviderSeo
}

/**
 * Owner-authored search metadata. Every field is an **override**: `undefined` means
 * "no override, compose the default from the name, organization and categories", which
 * is what `generateMetadata` on the public profile falls back to. That is why these are
 * optional rather than empty strings — clearing one has to restore the default, not
 * blank the tag.
 *
 * On `basic`/`details`/`services`/`personal`'s level rather than inside `details`
 * because it is neither contact information nor private: these end up as public `<meta>`
 * tags, and the public `GET /providers/:id` payload carries them for exactly that reason.
 */
export type ProviderSeo = {
  title?: string
  description?: string
  /** The public page key: the page is `/p/<slug>`, or `/p/<id>` without one. */
  slug?: string
  /** When anything search engines see on the public page last changed — `dateModified`. */
  updatedAt?: string
}

/**
 * The denormalised review aggregate, as every provider payload carries it.
 *
 * `count: 0` is the unrated state and `average` is `0` beside it — which the UI must
 * render as "no reviews yet", never as zero stars. Checking `count` rather than
 * `average` is what keeps those two apart.
 */
export type ProviderRating = {
  average: number
  count: number
}

export type GalleryItem = {
  name: string
  url: string
}

export type WeekSchedule = Record<WeekDay, DaySchedule>

export type DaySchedule = {
  availability: DaySchedulePart
  breaks: DaySchedulePart[]
}

export type DaySchedulePart = { start: string; end: string }

/** What a 29th–31st does in a month without one: skipped, or moved to the month's last day. */
export type ShortMonths = 'skip' | 'last'

/** Days of the month a rule recurs on: 1–31, plus the month's last day, whatever its number. */
export type MonthDays = { days: number[]; lastDay?: boolean; shortMonths?: ShortMonths }

/** `open` sets a date's hours (an added date); `closed` takes the day away, or only some ranges. */
export type ExceptionKind = 'open' | 'closed'

/**
 * The base of a provider's hours: the weekly hours (`weekSchedule`, kept under every rule so a
 * switch back loses nothing), days of the month at one set of hours, or specific dates only —
 * the open `specialDates`. Server twin: `server/src/lib/service-availability.ts`.
 */
export type ProviderScheduleRule =
  | { mode: 'weekdays' }
  | ({ mode: 'monthDays'; hours: DaySchedule } & MonthDays)
  | { mode: 'dates' }

/**
 * A run of calendar days that does not follow the rule. `open`: `hours` are the day's hours.
 * `closed`: closed all day when `hours` is null, otherwise closed only for those ranges.
 * `from`/`to` are inclusive `YYYY-MM-DD` on the provider's calendar (a single day has
 * `from === to`). Entries never overlap. Server twin and validation:
 * `server/src/lib/service-availability.ts`.
 */
export type SpecialDate = {
  from: string
  to: string
  kind: ExceptionKind
  hours: DaySchedule | null
  note?: string
}

/** A service's own date exception: `open` without `hours` is "on the provider's hours that day". */
export type ServiceException = {
  from: string
  to: string
  kind: ExceptionKind
  hours?: DaySchedulePart[]
  note?: string
}

/**
 * When a service can be booked. It picks **days** and, optionally, **hours** — always inside
 * the provider's own hours (`weekSchedule`, overridden by `specialDates`), never outside them:
 * a service narrows the provider's frame and cannot widen it. Effective windows:
 * `@helpers/serviceAvailability`; the warnings when a service reaches outside the provider's
 * hours: `@helpers/scheduleConflicts`. Server twin and validation:
 * `server/src/lib/service-availability.ts`.
 *
 * - `weekdays` — every listed weekday; `hoursByDay` may give each its own windows.
 * - `monthDays` — every listed day of every month (1–31), the last day (`lastDay`), and a short
 *   month's last day for a listed day it lacks when `shortMonths` is `'last'`.
 * - `dates` — each listed `YYYY-MM-DD`, on the provider's calendar.
 * - `hours` (any mode) — the windows it keeps to on those days; absent is the provider's hours.
 * - `exceptions` — dates added (`open`) or taken away (`closed`, whole day or some ranges).
 */
export type ServiceAvailability = (
  | { mode: 'always' }
  | { mode: 'weekdays'; days: WeekDay[] }
  | ({ mode: 'monthDays' } & MonthDays)
  | { mode: 'dates'; dates: string[] }
) & {
  hours?: DaySchedulePart[]
  hoursByDay?: Partial<Record<WeekDay, DaySchedulePart[]>>
  exceptions?: ServiceException[]
}

export type ProviderService = {
  id: string
  name: string
  duration: number
  description?: string
  price?: number
  currency?: string
  image?: string
  /** False when the provider has withdrawn this offering. Defaults to true from the API. */
  active: boolean
  /** `{ mode: 'always' }` from the API when the provider set no rule. */
  availability: ServiceAvailability
}

/**
 * Owner-only, and where the plan lives. Everything past `plan` is optional so the empty
 * initial state needs no web copy of the catalogue; a tab that gates on `entitlements`
 * reads the loaded profile, never the default.
 */
type ProviderPersonalValues = Pick<ProviderPlan, 'plan'> & Partial<Omit<ProviderPlan, 'plan'>>

export type ProviderProfileActions = {
  // setProviderProfileData: (payload: Partial<ProviderProfileState>) => void
  getProviderProfileData: () => Promise<void>
  putProviderProfileData: (payload: PutProviderProfileAPI['payload']) => Promise<void>
  deleteProviderService: (payload: DeleteProviderServiceAPI['payload']) => Promise<void>
  postProviderService: (payload: PostProviderServiceAPI['payload']) => Promise<void>
  putProviderService: (payload: PutProviderServiceAPI['payload']) => Promise<void>
}
