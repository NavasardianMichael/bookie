import { Plan, PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

// Run directly via tsx, so it does not go through src/config.ts and has to load
// the env file itself — otherwise DATABASE_URL is undefined.
import 'dotenv/config'

const prisma = new PrismaClient()

const DEV_OTP = '123456'

const defaultWeekSchedule = () => ({
  monday: { availability: { start: '09:00', end: '17:00' }, breaks: [] },
  tuesday: { availability: { start: '09:00', end: '17:00' }, breaks: [] },
  wednesday: { availability: { start: '09:00', end: '17:00' }, breaks: [] },
  thursday: { availability: { start: '09:00', end: '17:00' }, breaks: [] },
  friday: { availability: { start: '09:00', end: '17:00' }, breaks: [] },
  saturday: { availability: { start: '', end: '' }, breaks: [] },
  sunday: { availability: { start: '', end: '' }, breaks: [] },
})

async function upsertUser(phoneCode: number, phoneNumber: bigint) {
  const otpHash = await bcrypt.hash(DEV_OTP, 10)
  return prisma.user.upsert({
    where: {
      phoneCode_phoneNumber: { phoneCode, phoneNumber },
    },
    create: { phoneCode, phoneNumber, otpHash },
    update: { otpHash },
  })
}

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
  let phoneSuffix = BigInt(77000100)

  for (const def of providerDefs) {
    const user = await upsertUser(374, phoneSuffix)
    phoneSuffix += BigInt(1)
    const provider = await prisma.provider.create({
      data: {
        userId: user.id,
        firstName: def.firstName,
        lastName: def.lastName,
        description: `${def.firstName} ${def.lastName} — experienced specialist.`,
        imageUrl: '/logo.svg',
        email: `${def.firstName.toLowerCase()}.${def.lastName.toLowerCase()}@bookie.am`,
        country: 'AM',
        address: organizations[def.org]!.address,
        locationUrl: `https://maps.google.com/?q=${encodeURIComponent(organizations[def.org]!.address)}`,
        available: true,
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

  const consumerDefs = [
    { firstName: 'Alex', lastName: 'Consumer', email: 'alex@example.com', phone: BigInt(77000201) },
    { firstName: 'Maria', lastName: 'Patient', email: 'maria@example.com', phone: BigInt(77000202) },
    { firstName: 'Sam', lastName: 'Bookings', email: null, phone: BigInt(77000203) },
    { firstName: 'Elena', lastName: 'Client', email: 'elena@example.com', phone: BigInt(77000204) },
  ]

  const consumers = []
  for (const def of consumerDefs) {
    const user = await upsertUser(374, def.phone)
    const consumer = await prisma.consumer.create({
      data: {
        userId: user.id,
        firstName: def.firstName,
        lastName: def.lastName,
        email: def.email,
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

  if (service0) {
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
        notes: 'Seed appointment',
      },
    })
  }

  await prisma.review.create({
    data: {
      consumerId: consumers[0]!.id,
      providerId: providers[0]!.id,
      rating: 5,
      comment: 'Excellent care and very professional.',
    },
  })

  await prisma.review.create({
    data: {
      consumerId: consumers[1]!.id,
      organizationId: organizations[0]!.id,
      rating: 4,
      comment: 'Clean facility and friendly staff.',
    },
  })

  console.log('Seed complete.')
  console.log(`Dev OTP for all seeded phones: ${DEV_OTP}`)
  console.log('Example provider login: phone +37477000100, userType provider')
  console.log('Example consumer login: phone +37477000201, userType consumer')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
