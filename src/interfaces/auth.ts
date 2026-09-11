import { PhoneNumber } from '@interfaces/app'
import { SIGN_ON_STEPS, USER_TYPES } from '@constants/auth'

export type UserType = (typeof USER_TYPES)[keyof typeof USER_TYPES]

export type SignOnStep = (typeof SIGN_ON_STEPS)[keyof typeof SIGN_ON_STEPS]

/**
 * The profile half of a registration — everything that lands on the `Provider` or
 * `Consumer` row rather than on the `User`.
 *
 * `firstName` and `lastName` stay separate everywhere; the server stores two columns for
 * both roles.
 */
export type RegistrationProfile = {
  firstName: string
  lastName: string
  /**
   * ISO 3166-1 alpha-2, taken from the country picked on the phone field.
   *
   * Carried separately rather than derived from `phone.code`, because a dialling code does
   * not identify a country: +1 is the US, Canada and ~20 more. The selection is the only
   * place the real answer exists. Google does not supply one either — its `locale` is a
   * language tag, so `en-GB` would yield the wrong country and `hy` none at all.
   */
  country?: string
  /** Provider only — set when an existing organization was picked from the combobox. */
  organizationId?: string
  /** Provider only — free text the provider typed; creates an organization on success. */
  organizationName?: string
}

/**
 * The provider form's Organization field. Either an organization picked from the combobox
 * (`id` set) or a name typed that does not exist yet, which the server creates.
 */
export type OrganizationValue = {
  id?: string
  name: string
}

/**
 * What `POST /identity/register` sends.
 *
 * **Phone is mandatory but is not identity** — it is unverified contact data on the
 * profile, with no unique constraint, because a clinic line shared by four providers is
 * ordinary.
 */
export type RegistrationPayload = {
  role: UserType
  email: string
  password: string
  phone: PhoneNumber
  profile: RegistrationProfile
  /** Decides which locale the verification link lands in. */
  locale: string
}

/** What `GET /identity/me` and every sign-in path answer with. */
export type Session = {
  role: UserType
  profileId: string
  userId?: string
  firstName?: string
  lastName?: string
  /** Provider portrait path, when present. */
  image?: string
  email?: string
  emailVerified?: boolean
  authProvider?: 'local' | 'google'
  phone?: PhoneNumber
  /** False for a Google-only account, which has no password to change. */
  hasPassword?: boolean
  hasGoogle?: boolean
}

/**
 * A verified Google identity with no account yet, parked in a short-lived cookie while the
 * completion form collects the role and phone Google cannot supply. The email is fixed —
 * it is the thing Google verified.
 */
export type PendingGoogleAccount = {
  email: string
  firstName: string
  lastName: string
  role: UserType | null
  image?: string
}
