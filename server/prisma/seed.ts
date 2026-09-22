import { AuthProvider, Plan, PrismaClient } from '@prisma/client'
import { hashPassword } from '../src/lib/password.js'
import { hashUrlToken, mintUrlToken } from '../src/lib/token.js'
import { recomputeProviderRating } from '../src/services/reviews.js'

// Run directly via tsx, so it does not go through src/config.ts and has to load
// the env file itself — otherwise DATABASE_URL is undefined.
import 'dotenv/config'

const prisma = new PrismaClient()

/**
 * One password for every seeded **local** account. Identity is an email plus either an
 * argon2 hash or a Google `sub` — the two credentials `user_credential_present` accepts.
 * The seed hashes exactly like `POST /identity/register` does, via `lib/password.ts`, never
 * a second hasher, or a seeded account would be one `verifyPassword` could not recognise.
 * Documented in `docs/DEV_CREDS.md`.
 */
const DEV_PASSWORD = 'bookie-dev-1234'
const SEED_APPOINTMENT_NOTE = 'Seed appointment'
const SEED_GUEST_APPOINTMENT_NOTE = 'Seed guest appointment'
/**
 * Two rows on provider 1, who seeds with `requiresBookingApproval` on, so the Approvals
 * tab has both cases it has to render: a signed-in booker and an anonymous one. Without
 * them the tab only ever shows its empty state locally, and the row layout — notes,
 * phone, price, payment intent — is never once looked at before it ships.
 */
const SEED_PENDING_NOTE = 'Seed pending approval'
const SEED_PENDING_GUEST_NOTE = 'Seed pending approval (guest)'
const PHONE_CODE = 374

/**
 * Phone is no longer identity — it is an unverified contact field on each profile, with no
 * unique constraint. These are just plausible distinct numbers; nothing keys off them.
 */
const LOGIN_PROVIDER_PHONE = BigInt(99999999)
const LOGIN_CONSUMER_PHONE = BigInt(99000000)
const OTHER_PROVIDER_PHONE_START = BigInt(77000101)
const GOOGLE_CONSUMER_PHONE = BigInt(77000205)
const GUEST_PHONE = BigInt(77000999)

const seedManageTokenHash = (): string => hashUrlToken(mintUrlToken())

/** Fake Google `sub`. Will never match a real OAuth callback; this row is a fixture. */
const GOOGLE_CONSUMER_SUB = 'seed-google-gohar-nazaryan'

const defaultWeekSchedule = () => ({
  monday: { availability: { start: '09:00', end: '17:00' }, breaks: [] },
  tuesday: { availability: { start: '09:00', end: '17:00' }, breaks: [] },
  wednesday: { availability: { start: '09:00', end: '17:00' }, breaks: [] },
  thursday: { availability: { start: '09:00', end: '17:00' }, breaks: [] },
  friday: { availability: { start: '09:00', end: '17:00' }, breaks: [] },
  saturday: { availability: { start: '', end: '' }, breaks: [] },
  sunday: { availability: { start: '', end: '' }, breaks: [] },
})

type SeedAccount =
  | { email: string; auth: 'local'; passwordHash: string }
  | { email: string; auth: 'google'; googleId: string }

/**
 * A seeded account, ready to sign in with — or, for the Google fixture, ready to *exist*.
 *
 * Email is required on every row: it is the identity, whether the credential is a password
 * or a Google `sub`. `emailVerifiedAt` is stamped because `middleware/auth.ts` refuses a
 * session for an unverified account on **every** authenticated request — an unstamped seed
 * would create accounts that exist, accept the right password, and then fail every call
 * after login. Google accounts are stamped too: Google already confirmed the address.
 *
 * `upsert` on `email`, which is the unique key now, so the seed stays re-runnable (it runs
 * on every `pnpm install`). A local account's password is re-hashed on update so changing
 * `DEV_PASSWORD` takes effect on an existing database. A Google account's update clears
 * `passwordHash` so a re-run cannot accidentally turn it into a dual-credential row.
 */
async function upsertUser(account: SeedAccount) {
  const email = account.email.toLowerCase()
  const emailVerifiedAt = new Date()

  if (account.auth === 'google') {
    return prisma.user.upsert({
      where: { email },
      create: {
        email,
        googleId: account.googleId,
        authProvider: AuthProvider.google,
        emailVerifiedAt,
      },
      update: {
        googleId: account.googleId,
        authProvider: AuthProvider.google,
        passwordHash: null,
        emailVerifiedAt,
      },
    })
  }

  return prisma.user.upsert({
    where: { email },
    create: {
      email,
      passwordHash: account.passwordHash,
      authProvider: AuthProvider.local,
      emailVerifiedAt,
    },
    update: {
      passwordHash: account.passwordHash,
      authProvider: AuthProvider.local,
      emailVerifiedAt,
    },
  })
}

/** `anna.petrosyan@bookie.am` — the identity address, distinct from a profile's public one. */
const seedEmail = (firstName: string, lastName: string): string =>
  `${firstName.toLowerCase()}.${lastName.toLowerCase()}@bookie.am`

async function main() {
  console.log('Seeding database...')

  // One hash for every local account. Argon2id is ~80ms; hashing per row would be ~1s of
  // identical work. A unique salt per user is not load-bearing for a shared dev password.
  const localPasswordHash = await hashPassword(DEV_PASSWORD)

  const categoryNames = [
    'General Practice',
    'Dentistry',
    'Physiotherapy',
    'Dermatology',
    'Cardiology',
    'Mental Health',
  ]

  const categories = await Promise.all(
    categoryNames.map((name) =>
      prisma.category.upsert({
        where: { name },
        create: { name },
        update: {},
      })
    )
  )

  const orgData = [
    {
      name: 'City Health Clinic',
      description: 'Full-service urban clinic',
      phone: '+37410123456',
      country: 'AM',
      address: '12 Abovyan St, Yerevan',
      email: 'info@cityhealth.am',
      website: 'https://cityhealth.am',
      logoUrl: '/logo.svg',
      categoryIdx: 0,
    },
    {
      name: 'Bright Smile Dental',
      description: 'Modern dental care',
      phone: '+37410987654',
      country: 'AM',
      address: '45 Tumanyan St, Yerevan',
      email: 'hello@brightsmile.am',
      website: 'https://brightsmile.am',
      logoUrl: '/logo.svg',
      categoryIdx: 1,
    },
    {
      name: 'MoveWell Physio',
      description: 'Sports and rehab physiotherapy',
      phone: '+37410555123',
      country: 'AM',
      address: '8 Komitas Ave, Yerevan',
      email: 'contact@movewell.am',
      website: 'https://movewell.am',
      logoUrl: '/logo.svg',
      categoryIdx: 2,
    },
    {
      name: 'SkinCare Center',
      description: 'Dermatology specialists',
      phone: '+37410444555',
      country: 'AM',
      address: '3 Mashtots Ave, Yerevan',
      email: 'book@skincare.am',
      website: 'https://skincare.am',
      logoUrl: '/logo.svg',
      categoryIdx: 3,
    },
    {
      name: 'HeartLine Medical',
      description: 'Cardiology department',
      phone: '+37410333444',
      country: 'AM',
      address: '20 Nalbandyan St, Yerevan',
      email: 'care@heartline.am',
      website: 'https://heartline.am',
      logoUrl: '/logo.svg',
      categoryIdx: 4,
    },
    {
      name: 'Mindful Therapy Hub',
      description: 'Counseling and therapy',
      phone: '+37410222333',
      country: 'AM',
      address: '7 Baghramyan Ave, Yerevan',
      email: 'support@mindful.am',
      website: 'https://mindful.am',
      logoUrl: '/logo.svg',
      categoryIdx: 5,
    },
    {
      name: 'Regional Hospital North',
      description: 'Multi-specialty hospital',
      phone: '+37410111222',
      country: 'AM',
      address: '1 Hospital Rd, Gyumri',
      email: 'admin@regionalnorth.am',
      website: 'https://regionalnorth.am',
      logoUrl: '/logo.svg',
      categoryIdx: 0,
    },
    {
      name: 'Wellness Dental Group',
      description: 'Family dentistry network',
      phone: '+37410999111',
      country: 'AM',
      address: '55 Sayat-Nova, Yerevan',
      email: 'info@wellnessdental.am',
      website: 'https://wellnessdental.am',
      logoUrl: '/logo.svg',
      categoryIdx: 1,
    },
  ]

  const organizations = []
  for (const org of orgData) {
    // Organization.name carries no unique constraint, so there is nothing to upsert
    // against — without this lookup every run appends another copy of all eight.
    const existing = await prisma.organization.findFirst({ where: { name: org.name } })
    if (existing) {
      organizations.push(existing)
      continue
    }

    const created = await prisma.organization.create({
      data: {
        name: org.name,
        description: org.description,
        phone: org.phone,
        country: org.country,
        address: org.address,
        locationUrl: `https://maps.google.com/?q=${encodeURIComponent(org.address)}`,
        email: org.email,
        website: org.website,
        logoUrl: org.logoUrl,
        categories: {
          create: [{ categoryId: categories[org.categoryIdx]!.id }],
        },
      },
    })
    organizations.push(created)
  }

  const providerDefs = [
    { firstName: 'Anna', lastName: 'Petrosyan', org: 0, cats: [0], plan: Plan.standard },
    { firstName: 'David', lastName: 'Hakobyan', org: 0, cats: [0], plan: Plan.free },
    { firstName: 'Lilit', lastName: 'Sargsyan', org: 1, cats: [1], plan: Plan.premium },
    { firstName: 'Armen', lastName: 'Grigoryan', org: 1, cats: [1], plan: Plan.basic },
    { firstName: 'Narine', lastName: 'Avetisyan', org: 2, cats: [2], plan: Plan.standard },
    { firstName: 'Tigran', lastName: 'Martirosyan', org: 2, cats: [2], plan: Plan.free },
    { firstName: 'Sona', lastName: 'Melikyan', org: 3, cats: [3], plan: Plan.basic },
    { firstName: 'Vardan', lastName: 'Khachatryan', org: 4, cats: [4], plan: Plan.premium },
    { firstName: 'Ani', lastName: 'Danielyan', org: 5, cats: [5], plan: Plan.standard },
    { firstName: 'Gor', lastName: 'Poghosyan', org: 5, cats: [5], plan: Plan.free },
    { firstName: 'Mariam', lastName: 'Tonoyan', org: 6, cats: [0], plan: Plan.basic },
    { firstName: 'Levon', lastName: 'Babayan', org: 7, cats: [1], plan: Plan.standard },
  ]

  const providers = []
  let phoneSuffix = OTHER_PROVIDER_PHONE_START

  for (const [index, def] of providerDefs.entries()) {
    const phoneNumber = index === 0 ? LOGIN_PROVIDER_PHONE : phoneSuffix++
    const user = await upsertUser({
      email: seedEmail(def.firstName, def.lastName),
      auth: 'local',
      passwordHash: localPasswordHash,
    })
    const provider = await prisma.provider.upsert({
      where: { userId: user.id },
      // A no-op update, like the categories and organizations above: re-running the seed
      // must not duplicate a provider's services or overwrite edits made while developing.
      update: {},
      create: {
        userId: user.id,
        firstName: def.firstName,
        lastName: def.lastName,
        description: `${def.firstName} ${def.lastName} — experienced specialist.`,
        imageUrl: '/logo.svg',
        phoneCode: PHONE_CODE,
        phoneNumber,
        // The *published* contact address, deliberately the same string as the identity
        // email here but a different column — one is shown on the public profile, the
        // other is what the account authenticates against.
        publicEmail: seedEmail(def.firstName, def.lastName),
        country: 'AM',
        address: organizations[def.org]!.address,
        locationUrl: `https://maps.google.com/?q=${encodeURIComponent(organizations[def.org]!.address)}`,
        available: true,
        listed: true,
        plan: def.plan,
        organizationId: organizations[def.org]!.id,
        weekSchedule: defaultWeekSchedule(),
        categories: {
          create: def.cats.map((idx) => ({ categoryId: categories[idx]!.id })),
        },
        services: {
          create: [
            {
              name: 'Initial consultation',
              durationMinutes: 30,
              categoryId: categories[def.cats[0]!]!.id,
              description: 'First visit assessment',
              price: 15000,
              currency: 'AMD',
            },
            {
              name: 'Follow-up visit',
              durationMinutes: 30,
              categoryId: categories[def.cats[0]!]!.id,
              description: 'Follow-up appointment',
              price: 10000,
              currency: 'AMD',
            },
            ...(def === providerDefs[0]
              ? [
                  {
                    name: 'Draft offering',
                    durationMinutes: 15,
                    active: false,
                  },
                ]
              : []),
          ],
        },
      },
    })
    providers.push(provider)
  }

  /**
   * No published address on the Consumer row. `Provider.publicEmail` exists because a
   * provider's page shows one; a consumer's only address is the identity `User.email`,
   * which `seedEmail` derives from the name below. That address is required even for the
   * Google-only fixture — Google accounts authenticate with a `sub`, not a password, but
   * they still have an email.
   */
  const consumerDefs: Array<{
    firstName: string
    lastName: string
    phone: bigint
    googleId?: string
  }> = [
    { firstName: 'Alex', lastName: 'Consumer', phone: LOGIN_CONSUMER_PHONE },
    { firstName: 'Maria', lastName: 'Patient', phone: BigInt(77000202) },
    { firstName: 'Sam', lastName: 'Bookings', phone: BigInt(77000203) },
    { firstName: 'Elena', lastName: 'Client', phone: BigInt(77000204) },
    {
      firstName: 'Gohar',
      lastName: 'Nazaryan',
      phone: GOOGLE_CONSUMER_PHONE,
      googleId: GOOGLE_CONSUMER_SUB,
    },
  ]

  const consumers = []
  for (const def of consumerDefs) {
    const email = seedEmail(def.firstName, def.lastName)
    const user = await upsertUser(
      def.googleId
        ? { email, auth: 'google', googleId: def.googleId }
        : { email, auth: 'local', passwordHash: localPasswordHash }
    )
    const consumer = await prisma.consumer.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        firstName: def.firstName,
        lastName: def.lastName,
        phoneCode: PHONE_CODE,
        phoneNumber: def.phone,
        country: 'AM',
        favorites: {
          create: [{ providerId: providers[0]!.id }],
        },
      },
    })
    consumers.push(consumer)
  }

  const slot = (hours: number, minutes = 0) => {
    const startAt = new Date()
    startAt.setDate(startAt.getDate() + 1)
    startAt.setHours(hours, minutes, 0, 0)
    const endAt = new Date(startAt)
    endAt.setMinutes(endAt.getMinutes() + 30)
    return { startAt, endAt }
  }

  const service0 = await prisma.service.findFirst({ where: { providerId: providers[0]!.id } })

  // Appointment and Review have no unique constraint to upsert against, so an existence
  // check is what stops a second run from stacking up duplicates.
  const seededAppointment = await prisma.appointment.findFirst({
    where: { providerId: providers[0]!.id, notes: SEED_APPOINTMENT_NOTE },
  })

  if (service0 && !seededAppointment) {
    const { startAt, endAt } = slot(10)
    await prisma.appointment.create({
      data: {
        consumerId: consumers[0]!.id,
        providerId: providers[0]!.id,
        serviceId: service0.id,
        organizationId: providers[0]!.organizationId,
        startAt,
        endAt,
        durationMinutes: 30,
        price: service0.price,
        currency: service0.currency,
        status: 'confirmed',
        notes: SEED_APPOINTMENT_NOTE,
        manageTokenHash: seedManageTokenHash(),
      },
    })
  } else if (service0 && seededAppointment && seededAppointment.price === null) {
    // Older runs created this row before the price snapshot existed.
    await prisma.appointment.update({
      where: { id: seededAppointment.id },
      data: { price: service0.price, currency: service0.currency },
    })
  }

  const seededGuestAppointment = await prisma.appointment.findFirst({
    where: { providerId: providers[0]!.id, notes: SEED_GUEST_APPOINTMENT_NOTE },
  })

  if (service0 && !seededGuestAppointment) {
    const { startAt, endAt } = slot(11)
    await prisma.appointment.create({
      data: {
        providerId: providers[0]!.id,
        serviceId: service0.id,
        organizationId: providers[0]!.organizationId,
        startAt,
        endAt,
        durationMinutes: 30,
        price: service0.price,
        currency: service0.currency,
        status: 'scheduled',
        notes: SEED_GUEST_APPOINTMENT_NOTE,
        // `appointment_actor_present` requires all four once `consumerId` is null.
        // Email is the handle now that accounts are keyed on it, not phone.
        guestFirstName: 'Narek',
        guestLastName: 'Visitor',
        guestPhoneCode: PHONE_CODE,
        guestPhoneNumber: GUEST_PHONE,
        guestEmail: 'narek.visitor@example.com',
        manageTokenHash: seedManageTokenHash(),
      },
    })
  }

  /**
   * Provider 1 reviews every booking. Provider 0 keeps taking them automatically, so both
   * halves of the setting are reachable locally without touching the toggle first.
   *
   * Written unconditionally rather than only on create: `provider.upsert` above passes
   * `update: {}` so an existing row is left alone, which would leave a developer who
   * already has a seeded database without the flag the tab is about.
   */
  await prisma.provider.update({
    where: { id: providers[1]!.id },
    data: { requiresBookingApproval: true },
  })

  const service1 = await prisma.service.findFirst({ where: { providerId: providers[1]!.id } })

  const seededPending = await prisma.appointment.findFirst({
    where: { providerId: providers[1]!.id, notes: SEED_PENDING_NOTE },
  })

  if (service1 && !seededPending) {
    const { startAt, endAt } = slot(14)
    await prisma.appointment.create({
      data: {
        consumerId: consumers[1]!.id,
        providerId: providers[1]!.id,
        serviceId: service1.id,
        organizationId: providers[1]!.organizationId,
        startAt,
        endAt,
        durationMinutes: 30,
        price: service1.price,
        currency: service1.currency,
        status: 'pending',
        notes: SEED_PENDING_NOTE,
        paymentMethods: ['cash'],
        manageTokenHash: seedManageTokenHash(),
      },
    })
  }

  const seededPendingGuest = await prisma.appointment.findFirst({
    where: { providerId: providers[1]!.id, notes: SEED_PENDING_GUEST_NOTE },
  })

  if (service1 && !seededPendingGuest) {
    const { startAt, endAt } = slot(15)
    await prisma.appointment.create({
      data: {
        providerId: providers[1]!.id,
        serviceId: service1.id,
        organizationId: providers[1]!.organizationId,
        startAt,
        endAt,
        durationMinutes: 30,
        price: service1.price,
        currency: service1.currency,
        status: 'pending',
        notes: SEED_PENDING_GUEST_NOTE,
        paymentMethods: ['card_on_site'],
        guestFirstName: 'Anahit',
        guestLastName: 'Walkin',
        guestPhoneCode: PHONE_CODE,
        guestPhoneNumber: GUEST_PHONE,
        guestEmail: 'anahit.walkin@example.com',
        manageTokenHash: seedManageTokenHash(),
      },
    })
  }

  /**
   * Enough reviews to make the list, the histogram and the ranking look like themselves.
   *
   * Spread deliberately rather than evenly: provider 0 is the well-reviewed one, 1 and 2
   * have a handful, 3 has a single 5★ — which is the case worth being able to see, since
   * a plain average would put that provider top of Explore and the Bayesian score does
   * not. Providers 4+ stay unrated so the "no reviews yet" state is reachable too.
   *
   * `consumer` indexes into `consumers`, `provider` into `providers`.
   */
  const reviewDefs: { consumer: number; provider: number; rating: number; comment?: string }[] = [
    { consumer: 0, provider: 0, rating: 5, comment: 'Excellent care and very professional.' },
    { consumer: 1, provider: 0, rating: 5, comment: 'Booked same week and left delighted. Highly recommend.' },
    { consumer: 2, provider: 0, rating: 4, comment: 'Great result, though the room was running a little late.' },
    { consumer: 3, provider: 0, rating: 5, comment: 'Third visit now. Consistent every single time.' },
    // No comment: a rating-only review. The card has to render without a body.
    { consumer: 4, provider: 0, rating: 4 },
    { consumer: 0, provider: 1, rating: 3, comment: 'Fine, but not much time for questions.' },
    { consumer: 1, provider: 1, rating: 4, comment: 'Friendly and thorough. Would come back.' },
    { consumer: 2, provider: 2, rating: 2, comment: 'Ran 40 minutes late and seemed rushed.' },
    { consumer: 3, provider: 3, rating: 5, comment: 'Brilliant. Could not have asked for better.' },
  ]

  for (const def of reviewDefs) {
    const consumer = consumers[def.consumer]
    const provider = providers[def.provider]
    if (!consumer || !provider) continue

    // `findFirst` on the identifying pair, not `upsert`: `Review` has no unique key to
    // upsert against, so a plain `create` is what stacks duplicates on the second install.
    const seeded = await prisma.review.findFirst({
      where: { consumerId: consumer.id, providerId: provider.id },
    })
    if (seeded) continue

    await prisma.review.create({
      data: {
        consumerId: consumer.id,
        providerId: provider.id,
        rating: def.rating,
        comment: def.comment,
      },
    })
  }

  const seededOrganizationReview = await prisma.review.findFirst({
    where: { consumerId: consumers[1]!.id, organizationId: organizations[0]!.id },
  })

  if (!seededOrganizationReview) {
    await prisma.review.create({
      data: {
        consumerId: consumers[1]!.id,
        organizationId: organizations[0]!.id,
        rating: 4,
        comment: 'Clean facility and friendly staff.',
      },
    })
  }

  /**
   * Recompute every rated provider's aggregate.
   *
   * Unconditional rather than only-when-a-review-was-created, because this also repairs a
   * database seeded before the columns existed: the migration backfills once, but a dev
   * who edits `reviewDefs` or deletes a row by hand needs the numbers to follow. It is
   * one aggregate per rated provider on a seed run, which is nothing.
   */
  for (const provider of providers) {
    await recomputeProviderRating(prisma, provider.id)
  }

  console.log('Seed complete.')
  console.log(`Password for every local seeded account: ${DEV_PASSWORD}`)
  console.log('Example provider login: anna.petrosyan@bookie.am')
  console.log('Example consumer login: alex.consumer@bookie.am')
  console.log(
    'Google-only fixture (no password): gohar.nazaryan@bookie.am — email is still required'
  )
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
