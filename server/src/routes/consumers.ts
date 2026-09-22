import { Router } from 'express'
import { ok } from '../lib/api-response.js'
import { mergeConsumerNotificationPrefs } from '../lib/notification-prefs.js'
import { toPaymentMethods } from '../lib/payment.js'
import { prisma } from '../lib/prisma.js'
import type { SessionPayload } from '../lib/session.js'
import { mapBasicProvider, mapConsumer, providerInclude } from '../mappers/entities.js'
import { requireAuth } from '../middleware/auth.js'
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
 * below. If a provider ever needs to see who booked them, that belongs on the
 * appointment, scoped to that provider — not on a lookup keyed by a guessable id.
 */

/**
 * The caller's **own** Consumer row, whichever role their session happens to carry.
 *
 * This router used to sit behind `requireConsumer`, and that was a role check standing in
 * for an identity check — the same mistake `POST /appointments` corrected. `loadProfile`
 * resolves a session to `provider` whenever both profiles exist, so a provider who books
 * someone gets a Consumer row created by `resolveConsumerId` and then **can never reach
 * it**: their own notification preferences and payment methods sit on defaults with no
 * way to open them. That is what the workspace switch in the settings shell now offers,
 * and it would land on a 403 without this.
 *
 * It is not a widening of what anyone can see. The id is derived from `session.userId`
 * and is never a parameter, so there is still exactly one record any caller can reach:
 * their own. Mirrors `resolveConsumerId` in `routes/appointments.ts`, minus the create —
 * this is a read/write of something that must already exist, and booking is what creates
 * it.
 */
const ownConsumerId = async (session: SessionPayload): Promise<string> => {
  if (session.role === 'consumer') return session.profileId

  const consumer = await prisma.consumer.findUnique({
    where: { userId: session.userId },
    select: { id: true },
  })
  if (!consumer) throw new HttpError(404, 'Consumer profile not found', 404)
  return consumer.id
}

export const consumerProfileRouter = Router()

consumerProfileRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const consumer = await prisma.consumer.findUnique({
      where: { id: await ownConsumerId(req.session!) },
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
        emailVerifiedAt: consumer.user.emailVerifiedAt?.toISOString(),
        emailNotificationPrefs: mergeConsumerNotificationPrefs(consumer.emailNotificationPrefs),
        paymentInfo: consumer.paymentInfo
          ? { methods: toPaymentMethods(consumer.paymentInfo) }
          : undefined,
      },
    })
  })
)

consumerProfileRouter.put(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { firstName, lastName, emailNotificationPrefs, paymentInfo } = req.body ?? {}

    const consumer = await prisma.consumer.update({
      where: { id: await ownConsumerId(req.session!) },
      data: {
        firstName: firstName ?? undefined,
        lastName: lastName ?? undefined,
        emailNotificationPrefs:
          emailNotificationPrefs === undefined ? undefined : mergeConsumerNotificationPrefs(emailNotificationPrefs),
        // Consumers only store preferred methods — never a pay-to number or notes.
        paymentInfo: paymentInfo === undefined ? undefined : { methods: toPaymentMethods(paymentInfo) },
      },
      include: { user: { select: { email: true, emailVerifiedAt: true } } },
    })

    return ok(res, {
      ...mapConsumer(consumer),
      details: {
        favoriteProviders: [],
        emailVerifiedAt: consumer.user.emailVerifiedAt?.toISOString(),
        emailNotificationPrefs: mergeConsumerNotificationPrefs(consumer.emailNotificationPrefs),
        paymentInfo: consumer.paymentInfo
          ? { methods: toPaymentMethods(consumer.paymentInfo) }
          : undefined,
      },
    })
  })
)
