import { Router } from 'express'
import { ok } from '../lib/api-response.js'
import { prisma } from '../lib/prisma.js'
import { mapBasicProvider, providerListInclude } from '../mappers/entities.js'
import { requireAuth } from '../middleware/auth.js'
import { asyncHandler, HttpError } from '../middleware/error.js'

/**
 * The caller's saved providers. Scoped to `session.userId`, never a parameter, so there is
 * exactly one list any caller can read or write: their own.
 *
 * **`requireAuth`, not a role guard.** A favourite belongs to the account, and providers
 * browse other providers as much as anyone. Gating on `consumer` would repeat the mistake
 * `consumerProfileRouter` and `POST /appointments` both had to undo — a role standing in for
 * an identity.
 */
export const favoritesRouter = Router()

/**
 * The `/favorites` page: listed providers only, newest favourite first.
 *
 * A provider who unpublishes stays in the table (republishing brings them back) but drops
 * out of this read, because their public page 404s and a card that leads to a 404 is worse
 * than no card.
 */
favoritesRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const favorites = await prisma.favoriteProvider.findMany({
      where: { userId: req.session!.userId, provider: { listed: true } },
      include: { provider: { include: providerListInclude } },
      orderBy: { createdAt: 'desc' },
    })

    return ok(
      res,
      favorites.map((favorite) => mapBasicProvider(favorite.provider))
    )
  })
)

/**
 * Just the ids, for the hearts on every provider card. A separate read so that painting a
 * grid of hearts costs one indexed scan of the caller's own rows, not the joins
 * `mapBasicProvider` needs for a card.
 */
favoritesRouter.get(
  '/ids',
  requireAuth,
  asyncHandler(async (req, res) => {
    const favorites = await prisma.favoriteProvider.findMany({
      where: { userId: req.session!.userId },
      select: { providerId: true },
    })

    return ok(
      res,
      favorites.map((favorite) => favorite.providerId)
    )
  })
)

/**
 * Idempotent: favouriting twice is one row and one `200`, so a double tap or a retried
 * request cannot fail. `skipDuplicates` compiles to `ON CONFLICT DO NOTHING`, which also
 * holds under two concurrent requests, where a read-then-insert would race.
 */
favoritesRouter.put(
  '/:providerId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const provider = await prisma.provider.findUnique({
      where: { id: req.params.providerId },
      select: { id: true, userId: true, listed: true },
    })
    if (!provider) throw new HttpError(404, 'Provider not found', 404)
    // Before the listed check: an owner already knows their own page exists, so answering
    // them honestly leaks nothing, and "not found" about your own page would be a lie.
    // Checked against the account rather than the session's profile id, so it holds whatever
    // role the session resolved to.
    if (provider.userId === req.session!.userId) {
      throw new HttpError(403, 'You cannot favorite your own page', 403)
    }
    // Everyone else gets the same answer for "no such provider" and "unlisted": both are
    // pages they cannot open, and telling them apart would confirm an unlisted id exists.
    if (!provider.listed) throw new HttpError(404, 'Provider not found', 404)

    await prisma.favoriteProvider.createMany({
      data: [{ userId: req.session!.userId, providerId: provider.id }],
      skipDuplicates: true,
    })

    return ok(res, true)
  })
)

/**
 * Idempotent as well, and deliberately without the listed check: a provider who has since
 * unpublished must still be removable.
 */
favoritesRouter.delete(
  '/:providerId',
  requireAuth,
  asyncHandler(async (req, res) => {
    await prisma.favoriteProvider.deleteMany({
      where: { userId: req.session!.userId, providerId: req.params.providerId },
    })

    return ok(res, true)
  })
)
