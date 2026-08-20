import { Router } from 'express'
import multer from 'multer'
import path from 'node:path'
import { config } from '../config.js'
import { ok } from '../lib/api-response.js'
import { prisma } from '../lib/prisma.js'
import {
  mapBasicProvider,
  mapProviderProfile,
  mapService,
  mapSingleProvider,
  providerInclude,
} from '../mappers/entities.js'
import { requireProvider } from '../middleware/auth.js'
import { asyncHandler, HttpError } from '../middleware/error.js'
import { getProviderAvailability } from '../services/appointments.js'

const upload = multer({ dest: config.uploadDir })

export const providersRouter = Router()

providersRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const providers = await prisma.provider.findMany({
      include: providerInclude,
      orderBy: { lastName: 'asc' },
    })
    return ok(
      res,
      providers.map((p) => mapBasicProvider(p))
    )
  })
)

providersRouter.get(
  '/:id/availability',
  asyncHandler(async (req, res) => {
    const date = (req.query.date as string) ?? new Date().toISOString().slice(0, 10)
    const slots = await getProviderAvailability(req.params.id!, date)
    return ok(res, slots)
  })
)

providersRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const provider = await prisma.provider.findUnique({
      where: { id: req.params.id },
      include: providerInclude,
    })
    if (!provider) throw new HttpError(404, 'Provider not found', 404)
    return ok(res, mapSingleProvider(provider))
  })
)

export const providerProfileRouter = Router()

providerProfileRouter.get(
  '/',
  requireProvider,
  asyncHandler(async (req, res) => {
    const provider = await prisma.provider.findUnique({
      where: { id: req.session!.profileId },
      include: providerInclude,
    })
    if (!provider) throw new HttpError(404, 'Provider profile not found', 404)
    return ok(res, mapProviderProfile(provider))
  })
)

providerProfileRouter.put(
  '/',
  requireProvider,
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'gallery', maxCount: 10 },
  ]),
  asyncHandler(async (req, res) => {
    const providerId = req.session!.profileId
    const body = req.body as Record<string, string | undefined>
    const files = req.files as Record<string, Express.Multer.File[]> | undefined

    const categoryIdsRaw = body.categoryIds ?? body.CategoryIds
    const categoryIds = categoryIdsRaw ? (JSON.parse(categoryIdsRaw) as string[]) : undefined
    const weekScheduleRaw = body.weekSchedule ?? body.WeekSchedule
    const weekSchedule = weekScheduleRaw ? JSON.parse(weekScheduleRaw) : undefined

    const imageFile = files?.image?.[0]
    const imageUrl = imageFile ? `/uploads/${path.basename(imageFile.path)}` : undefined

    await prisma.provider.update({
      where: { id: providerId },
      data: {
        firstName: body.firstName ?? body.FirstName,
        lastName: body.lastName ?? body.LastName,
        description: body.description ?? body.Description,
        email: body.email ?? body.Email,
        address: body.address ?? body.Address,
        locationUrl: body.locationURL ?? body.LocationURL,
        organizationId: body.organizationId ?? body.OrganizationId ?? undefined,
        weekSchedule: weekSchedule ?? undefined,
        imageUrl: imageUrl ?? undefined,
        ...(categoryIds
          ? {
              categories: {
                deleteMany: {},
                create: categoryIds.map((categoryId) => ({ categoryId })),
              },
            }
          : {}),
      },
    })

    if (files?.gallery?.length) {
      await prisma.providerGallery.createMany({
        data: files.gallery.map((f) => ({
          providerId,
          name: f.originalname,
          url: `/uploads/${path.basename(f.path)}`,
        })),
      })
    }

    const updated = await prisma.provider.findUnique({
      where: { id: providerId },
      include: providerInclude,
    })

    return ok(res, mapProviderProfile(updated!))
  })
)

providersRouter.post(
  '/:providerId/services',
  requireProvider,
  upload.single('image'),
  asyncHandler(async (req, res) => {
    if (req.session!.profileId !== req.params.providerId) {
      throw new HttpError(403, 'Cannot modify another provider', 403)
    }

    const body = req.body as Record<string, string>
    const file = req.file
    const servicePayload = body.service ? JSON.parse(body.service) : body

    const service = await prisma.service.create({
      data: {
        providerId: req.params.providerId!,
        name: servicePayload.name ?? servicePayload.Name,
        durationMinutes: Number(servicePayload.duration ?? servicePayload.Duration ?? 30),
        categoryId: servicePayload.categoryId ?? servicePayload.CategoryId,
        description: servicePayload.description ?? servicePayload.Description,
        price:
          servicePayload.price ?? servicePayload.Price
            ? Number(servicePayload.price ?? servicePayload.Price)
            : undefined,
        currency: servicePayload.currency ?? servicePayload.Currency,
        imageUrl: file ? `/uploads/${path.basename(file.path)}` : undefined,
      },
    })

    return ok(res, mapService(service), 201)
  })
)

providersRouter.put(
  '/:providerId/services/:serviceId',
  requireProvider,
  upload.single('image'),
  asyncHandler(async (req, res) => {
    if (req.session!.profileId !== req.params.providerId) {
      throw new HttpError(403, 'Cannot modify another provider', 403)
    }

    const body = req.body as Record<string, string>
    const file = req.file
    const servicePayload = body.service ? JSON.parse(body.service) : body

    const service = await prisma.service.update({
      where: { id: req.params.serviceId },
      data: {
        name: servicePayload.name ?? servicePayload.Name,
        durationMinutes: Number(servicePayload.duration ?? servicePayload.Duration ?? 30),
        categoryId: servicePayload.categoryId ?? servicePayload.CategoryId,
        description: servicePayload.description ?? servicePayload.Description,
        price:
          servicePayload.price ?? servicePayload.Price
            ? Number(servicePayload.price ?? servicePayload.Price)
            : undefined,
        currency: servicePayload.currency ?? servicePayload.Currency,
        imageUrl: file ? `/uploads/${path.basename(file.path)}` : undefined,
      },
    })

    return ok(res, mapService(service))
  })
)

providersRouter.delete(
  '/:providerId/services/:serviceId',
  requireProvider,
  asyncHandler(async (req, res) => {
    if (req.session!.profileId !== req.params.providerId) {
      throw new HttpError(403, 'Cannot modify another provider', 403)
    }

    await prisma.service.delete({ where: { id: req.params.serviceId } })
    return ok(res, true)
  })
)
