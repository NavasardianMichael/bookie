import type { CountryCode } from 'libphonenumber-js'
import { PhoneNumber } from '@interfaces/app'
import { TimeFormat } from '@interfaces/schedule'
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
  /** Provider only — an existing organization picked from the suggestions. */
  organizationId?: string
  /** Provider only, and never alongside `organizationId` — an organization to create. */
  newOrganization?: NewOrganizationPayload
}

/**
 * An organization registered together with the provider, as `POST /identity/register`
 * takes it. It gets its own public page, so this is what that page shows.
 *
 * No `country`: the server gives it the provider's, which is the one picked on the phone
 * field. Phone is E.164 (`+37410222333`), the shape `Organization.phone` is stored in.
 */
export type NewOrganizationPayload = {
  name: string
  description?: string
  address?: string
  phone?: string
  website?: string
  /**
   * The provider was shown the organizations with a similar name and chose to create this
   * one anyway. Without it the server links an existing organization with the same name.
   */
  allowSimilar?: boolean
}

/**
 * The registration Organization field. Three states, and only two of them submit:
 *
 * - `id` set — an existing organization was picked from the suggestions;
 * - `isNew` — the provider chose "add as a new organization", which reveals the rest of
 *   its fields (`NewOrganizationFormValues`);
 * - neither — text typed but not yet resolved into one of the above. Validation refuses
 *   it rather than guessing, so a half-typed name never silently becomes an organization.
 */
export type OrganizationValue = {
  id?: string
  name: string
  isNew?: boolean
}

/**
 * The new-organization fields beneath the name, under the form's `newOrganization` key. The
 * phone is a country picker + national number, like the provider's own.
 */
export type NewOrganizationFormValues = {
  description?: string
  address?: string
  phoneCode?: CountryCode
  phoneNumber?: string
  website?: string
}

/**
 * What `POST /identity/register` sends.
 *
 * **Phone is not identity** — it is unverified contact data on the profile, with no
 * unique constraint, because a clinic line shared by four providers is ordinary. Both
 * roles must send one.
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
  /** The provider's published 12/24-hour choice. Provider sessions only; absent until chosen. */
  timeFormat?: TimeFormat
  email?: string
  emailVerified?: boolean
  authProvider?: 'local' | 'google'
  phone?: PhoneNumber
  /** False for a Google-only account, which has no password to change. */
  hasPassword?: boolean
  hasGoogle?: boolean
  /**
   * Which profiles this **account** holds — not which one the session is using.
   *
   * `role` is resolved provider-first at login, so it cannot answer this: a provider who
   * has booked someone holds a Consumer row too, and the settings shell offers its
   * workspace switch only when both are present.
   *
   * Optional because a payload minted before this shipped has no such key. Callers fall
   * back to `role`, which is the old, narrower behaviour rather than an open door.
   */
  profiles?: {
    consumer: boolean
    provider: boolean
  }
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
