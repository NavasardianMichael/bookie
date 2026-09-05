import { Router } from 'express'
import { ok } from '../lib/api-response.js'
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

consumerProfileRouter.get(
  '/',
  requireConsumer,
  asyncHandler(async (req, res) => {
    const consumer = await prisma.consumer.findUnique({
      where: { id: req.session!.profileId },
      include: {
        user: true,
        favorites: { include: { provider: { include: providerInclude } } },
      },
    })
    if (!consumer) throw new HttpError(404, 'Consumer profile not found', 404)

    return ok(res, {
      ...mapConsumer(consumer),
      details: {
        favoriteProviders: consumer.favorites.map((f) => mapBasicProvider(f.provider)),
      },
    })
  })
)

consumerProfileRouter.put(
  '/',
  requireConsumer,
  asyncHandler(async (req, res) => {
    const { firstName, lastName, email } = req.body ?? {}
    const consumer = await prisma.consumer.update({
      where: { id: req.session!.profileId },
      data: {
        firstName: firstName ?? undefined,
        lastName: lastName ?? undefined,
        email: email ?? undefined,
      },
      include: { user: true },
    })
    return ok(res, mapConsumer(consumer))
  })
)
