import { Plan, PrismaClient } from '@prisma/client'
import { hashPassword } from '../src/lib/password.js'

// Run directly via tsx, so it does not go through src/config.ts and has to load
// the env file itself — otherwise DATABASE_URL is undefined.
import 'dotenv/config'

const prisma = new PrismaClient()

/**
 * One password for every seeded account. Identity is now an email and an argon2 hash, so
 * the seed hashes exactly like `POST /identity/register` does — via `lib/password.ts`,
 * never a second hasher, or a seeded account would be one `verifyPassword` could not
 * recognise. Documented in `docs/DEV_CREDS.md`.
 */
const DEV_PASSWORD = 'bookie-dev-1234'
const SEED_APPOINTMENT_NOTE = 'Seed appointment'
const PHONE_CODE = 374

/**
 * Phone is no longer identity — it is an unverified contact field on each profile, with no
 * unique constraint. These are just plausible distinct numbers; nothing keys off them.
 */
const LOGIN_PROVIDER_PHONE = BigInt(99999999)
const LOGIN_CONSUMER_PHONE = BigInt(99000000)
const OTHER_PROVIDER_PHONE_START = BigInt(77000101)

const defaultWeekSchedule = () => ({
  monday: { availability: { start: '09:00', end: '17:00' }, breaks: [] },
  tuesday: { availability: { start: '09:00', end: '17:00' }, breaks: [] },
  wednesday: { availability: { start: '09:00', end: '17:00' }, breaks: [] },
  thursday: { availability: { start: '09:00', end: '17:00' }, breaks: [] },
  friday: { availability: { start: '09:00', end: '17:00' }, breaks: [] },
  saturday: { availability: { start: '', end: '' }, breaks: [] },
  sunday: { availability: { start: '', end: '' }, breaks: [] },
})

/**
 * A seeded account, ready to sign in with.
 *
 * `emailVerifiedAt` is stamped because `middleware/auth.ts` refuses a session for an
 * unverified account on **every** authenticated request — an unstamped seed would create
 * accounts that exist, accept the right password, and then fail every call after login.
 *
 * `upsert` on `email`, which is the unique key now, so the seed stays re-runnable (it runs
 * on every `pnpm install`). The password is re-hashed on update so changing `DEV_PASSWORD`
 * takes effect on an existing database.
 */
async function upsertUser(email: string) {
  const passwordHash = await hashPassword(DEV_PASSWORD)
  return prisma.user.upsert({
    where: { email },
    create: { email, passwordHash, authProvider: 'local', emailVerifiedAt: new Date() },
    update: { passwordHash, emailVerifiedAt: new Date() },
  })
}

/** `anna.petrosyan@bookie.am` — the identity address, distinct from a profile's public one. */
const seedEmail = (firstName: string, lastName: string): string =>
  `${firstName.toLowerCase()}.${lastName.toLowerCase()}@bookie.am`

async function main() {
  console.log('Seeding database...')

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
    const user = await upsertUser(seedEmail(def.firstName, def.lastName))
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
          ],
        },
      },
    })
    providers.push(provider)
  }

  /**
   * No email field: a consumer has no *published* address. `Provider.publicEmail` exists
   * because a provider's page shows one; a consumer's only address is the identity
   * `User.email`, which `seedEmail` derives from the name below.
   */
  const consumerDefs = [
    { firstName: 'Alex', lastName: 'Consumer', phone: LOGIN_CONSUMER_PHONE },
    { firstName: 'Maria', lastName: 'Patient', phone: BigInt(77000202) },
    { firstName: 'Sam', lastName: 'Bookings', phone: BigInt(77000203) },
    { firstName: 'Elena', lastName: 'Client', phone: BigInt(77000204) },
  ]

  const consumers = []
  for (const def of consumerDefs) {
    const user = await upsertUser(seedEmail(def.firstName, def.lastName))
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

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(10, 0, 0, 0)
  const tomorrowEnd = new Date(tomorrow)
  tomorrowEnd.setMinutes(tomorrowEnd.getMinutes() + 30)

  const service0 = await prisma.service.findFirst({ where: { providerId: providers[0]!.id } })

  // Appointment and Review have no unique constraint to upsert against, so an existence
  // check is what stops a second run from stacking up duplicates.
  const seededAppointment = await prisma.appointment.findFirst({
    where: { providerId: providers[0]!.id, notes: SEED_APPOINTMENT_NOTE },
  })

  if (service0 && !seededAppointment) {
    await prisma.appointment.create({
      data: {
        consumerId: consumers[0]!.id,
        providerId: providers[0]!.id,
        serviceId: service0.id,
        organizationId: providers[0]!.organizationId,
        startAt: tomorrow,
        endAt: tomorrowEnd,
        durationMinutes: 30,
        status: 'confirmed',
        notes: SEED_APPOINTMENT_NOTE,
      },
    })
  }

  const seededProviderReview = await prisma.review.findFirst({
    where: { consumerId: consumers[0]!.id, providerId: providers[0]!.id },
  })

  if (!seededProviderReview) {
    await prisma.review.create({
      data: {
        consumerId: consumers[0]!.id,
        providerId: providers[0]!.id,
        rating: 5,
        comment: 'Excellent care and very professional.',
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

  console.log('Seed complete.')
  console.log(`Password for every seeded account: ${DEV_PASSWORD}`)
  console.log('Example provider login: anna.petrosyan@bookie.am')
  console.log('Example consumer login: alex.consumer@bookie.am')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
