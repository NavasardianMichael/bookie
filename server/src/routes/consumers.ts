import { Router } from 'express'
import { ok } from '../lib/api-response.js'
import { prisma } from '../lib/prisma.js'
import { mapBasicProvider, mapConsumer, providerInclude } from '../mappers/entities.js'
import { requireConsumer } from '../middleware/auth.js'
import { asyncHandler, HttpError } from '../middleware/error.js'

export const consumersRouter = Router()

consumersRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const consumers = await prisma.consumer.findMany({ include: { user: true } })
    return ok(res, consumers.map(mapConsumer))
  })
)

consumersRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const consumer = await prisma.consumer.findUnique({
      where: { id: req.params.id },
      include: {
        user: true,
        favorites: { include: { provider: { include: providerInclude } } },
      },
    })
    if (!consumer) throw new HttpError(404, 'Consumer not found', 404)

    return ok(res, {
      ...mapConsumer(consumer),
      details: {
        favoriteProviders: consumer.favorites.map((f) => mapBasicProvider(f.provider)),
      },
    })
  })
)

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
    const { name } = req.body ?? {}
    const consumer = await prisma.consumer.update({
      where: { id: req.session!.profileId },
      data: { name: name ?? undefined },
      include: { user: true },
    })
    return ok(res, mapConsumer(consumer))
  })
)
