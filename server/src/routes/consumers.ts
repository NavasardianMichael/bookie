import { Router } from 'express'
import { ok } from '../lib/api-response.js'
import { toPaymentMethods } from '../lib/payment.js'
import { prisma } from '../lib/prisma.js'
import { mapBasicProvider, mapConsumer, providerInclude } from '../mappers/entities.js'
import { requireConsumer } from '../middleware/auth.js'
import { asyncHandler, HttpError } from '../middleware/error.js'

/**
 * There is deliberately **no public consumer router**.
 *
 * `GET /consumers` and `GET /consumers/:id` used to live here, unauthenticated, and
 * returned every consumer's name and phone number to anyone who asked. Nothing in the
 * app ever called them — the frontend has no consumer directory — so they were pure
 * exposure. A consumer is a private party to a booking, not a listing.
 *
 * A consumer reads and writes only their own record, through `consumerProfileRouter`
 * below, which is behind `requireConsumer`. If a provider ever needs to see who booked
 * them, that belongs on the appointment, scoped to that provider — not on a lookup keyed
 * by a guessable id.
 */

export const consumerProfileRouter = Router()

const defaultNotificationPrefs = {
  appointmentReminders: true,
  bookingChanges: true,
  marketing: false,
}

consumerProfileRouter.get(
  '/',
  requireConsumer,
  asyncHandler(async (req, res) => {
    const consumer = await prisma.consumer.findUnique({
      where: { id: req.session!.profileId },
      include: {
        // Narrowed from `user: true`: `mapConsumer` needs the identity email and the
        // route needs its verification state. There is no reason to load the password hash.
        user: { select: { email: true, emailVerifiedAt: true } },
        favorites: { include: { provider: { include: providerInclude } } },
      },
    })
    if (!consumer) throw new HttpError(404, 'Consumer profile not found', 404)

    return ok(res, {
      ...mapConsumer(consumer),
      details: {
        favoriteProviders: consumer.favorites.map((f) => mapBasicProvider(f.provider)),
        description: consumer.description ?? undefined,
        emailVerifiedAt: consumer.user.emailVerifiedAt?.toISOString(),
        emailNotificationPrefs: {
          ...defaultNotificationPrefs,
          ...(typeof consumer.emailNotificationPrefs === 'object' && consumer.emailNotificationPrefs
            ? (consumer.emailNotificationPrefs as Record<string, boolean>)
            : {}),
        },
        paymentInfo: consumer.paymentInfo
          ? { methods: toPaymentMethods(consumer.paymentInfo) }
          : undefined,
      },
    })
  })
)

consumerProfileRouter.put(
  '/',
  requireConsumer,
  asyncHandler(async (req, res) => {
    const { firstName, lastName, description, emailNotificationPrefs, paymentInfo } = req.body ?? {}

    const consumer = await prisma.consumer.update({
      where: { id: req.session!.profileId },
      data: {
        firstName: firstName ?? undefined,
        lastName: lastName ?? undefined,
        description: description === undefined ? undefined : description || null,
        emailNotificationPrefs: emailNotificationPrefs ?? undefined,
        // Consumers only store preferred methods — never a pay-to number or notes.
        paymentInfo: paymentInfo === undefined ? undefined : { methods: toPaymentMethods(paymentInfo) },
      },
      include: { user: { select: { email: true, emailVerifiedAt: true } } },
    })

    return ok(res, {
      ...mapConsumer(consumer),
      details: {
        favoriteProviders: [],
        description: consumer.description ?? undefined,
        emailVerifiedAt: consumer.user.emailVerifiedAt?.toISOString(),
        emailNotificationPrefs: {
          ...defaultNotificationPrefs,
          ...(typeof consumer.emailNotificationPrefs === 'object' && consumer.emailNotificationPrefs
            ? (consumer.emailNotificationPrefs as Record<string, boolean>)
            : {}),
        },
        paymentInfo: consumer.paymentInfo
          ? { methods: toPaymentMethods(consumer.paymentInfo) }
          : undefined,
      },
    })
  })
)
