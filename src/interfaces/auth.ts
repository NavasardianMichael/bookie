import { PhoneNumber } from '@interfaces/app'
import { SIGN_ON_STEPS, USER_TYPES } from '@constants/auth'

export type UserType = (typeof USER_TYPES)[keyof typeof USER_TYPES]

export type SignOnStep = (typeof SIGN_ON_STEPS)[keyof typeof SIGN_ON_STEPS]

/**
 * What a registration form collects before the OTP step. The account is only created once
 * the OTP verifies, so this crosses one screen as a draft and is replayed into
 * `POST /identity/login`.
 *
 * `firstName` and `lastName` stay separate everywhere — the server stores them as two
 * columns for both roles.
 */
export type RegistrationProfile = {
  firstName: string
  lastName: string
  /** Optional for consumers, required for providers. */
  email?: string
  /**
   * ISO 3166-1 alpha-2, taken from the country picked on the phone field. Stored for
   * both roles.
   *
   * It is carried separately rather than derived from `phone.code` on the server,
   * because a dialling code does not identify a country: +1 is the US, Canada and
   * ~20 more, +7 is Russia and Kazakhstan. The selection is the only place the real
   * answer exists, and it was being thrown away after `toPhoneNumber` used it.
   */
  country?: string
  /** Provider only — set when an existing organization was picked from the combobox. */
  organizationId?: string
  /** Provider only — free text the provider typed; creates an organization on success. */
  organizationName?: string
}

/**
 * The provider form's Organization field. Either an organization that was picked from the
 * combobox (`id` set) or a name typed that does not exist yet, which the server creates on
 * successful registration.
 */
export type OrganizationValue = {
  id?: string
  name: string
}

/**
 * Everything the OTP screen needs, written by whichever form sent the code.
 *
 * One record rather than the loose `accountType` / `phoneNumber` / `countryCode` keys this
 * replaces: holding the phone as a single object is what makes it impossible to pass the
 * country code and the number the wrong way round, which the resend button used to do.
 *
 * `registration` is present only when registering — sign-in has a phone and nothing else.
 */
export type PendingSignOn = {
  phone: PhoneNumber
  registration?: {
    userType: UserType
    profile: RegistrationProfile
  }
}

/** What `POST /identity/login` answers with, and the basis for where the funnel goes next. */
export type Session = {
  role: UserType
  profileId: string
}

export type LoginResult = Session & {
  /** False when an existing account just signed in, so onboarding can be skipped. */
  isNewUser: boolean
}
