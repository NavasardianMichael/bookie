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

const defaultProviderNotificationPrefs = {
  appointmentReminders: true,
  bookingChanges: true,
  newBooking: true,
}

type ProviderDraft = {
  firstName?: string
  lastName?: string
  description?: string | null
  imageUrl?: string | null
  weekSchedule?: unknown
  available?: boolean
  paymentInfo?: unknown
}

export const providersRouter = Router()

providersRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const providers = await prisma.provider.findMany({
      where: { listed: true },
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

    // Unlisted providers 404 for everyone except the owner (Preview Profile).
    const isOwner =
      req.session?.role === 'provider' && req.session.profileId === provider.id
    if (!provider.listed && !isOwner) {
      throw new HttpError(404, 'Provider not found', 404)
    }

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

    const mapped = mapProviderProfile(provider)
    return ok(res, {
      ...mapped,
      listed: provider.listed,
      draft: provider.draft ?? null,
      details: {
        ...mapped.details,
        emailVerifiedAt: provider.emailVerifiedAt?.toISOString(),
        emailNotificationPrefs: {
          ...defaultProviderNotificationPrefs,
          ...(typeof provider.emailNotificationPrefs === 'object' && provider.emailNotificationPrefs
            ? (provider.emailNotificationPrefs as Record<string, boolean>)
            : {}),
        },
        paymentInfo: provider.paymentInfo ?? undefined,
      },
    })
  })
)

/**
 * Body modes:
 * - `mode: 'draft'` — merge fields into `Provider.draft` (no public effect)
 * - `mode: 'publish'` — apply draft (or body fields) to live columns and clear draft
 * - `mode: 'listing'` — set `listed` only
 * - omitted / legacy — live update (onboarding formik path + prefs/payment without draft)
 */
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
    const mode = body.mode

    const imageFile = files?.image?.[0]
    const imageUrl = imageFile ? `/uploads/${path.basename(imageFile.path)}` : undefined

    const parseJson = <T>(raw: string | undefined): T | undefined => {
      if (!raw) return undefined
      try {
        return JSON.parse(raw) as T
      } catch {
        return undefined
      }
    }

    if (mode === 'listing') {
      const listedValue =
        typeof req.body?.listed === 'boolean'
          ? req.body.listed
          : body.listed === 'true' || body.listed === '1'

      const provider = await prisma.provider.update({
        where: { id: providerId },
        data: { listed: listedValue },
        include: providerInclude,
      })
      return ok(res, {
        ...mapProviderProfile(provider),
        listed: provider.listed,
        draft: provider.draft ?? null,
      })
    }

    if (mode === 'draft' || mode === 'publish') {
      const existing = await prisma.provider.findUnique({ where: { id: providerId } })
      if (!existing) throw new HttpError(404, 'Provider profile not found', 404)

      const weekScheduleRaw = body.weekSchedule ?? body.WeekSchedule ?? req.body?.weekSchedule
      const weekSchedule =
        typeof weekScheduleRaw === 'string'
          ? JSON.parse(weekScheduleRaw)
          : weekScheduleRaw && typeof weekScheduleRaw === 'object'
            ? weekScheduleRaw
            : undefined
      const paymentInfo =
        parseJson(typeof body.paymentInfo === 'string' ? body.paymentInfo : undefined) ??
        (typeof req.body?.paymentInfo === 'object' ? req.body.paymentInfo : undefined)
      const availableRaw = body.available ?? req.body?.available
      const available =
        availableRaw === undefined
          ? undefined
          : availableRaw === true || availableRaw === 'true' || availableRaw === '1'

      const patch: ProviderDraft = {
        ...(typeof existing.draft === 'object' && existing.draft ? (existing.draft as ProviderDraft) : {}),
      }
      if (body.firstName ?? body.FirstName) patch.firstName = body.firstName ?? body.FirstName
      if (body.lastName ?? body.LastName) patch.lastName = body.lastName ?? body.LastName
      if (body.description !== undefined || body.Description !== undefined) {
        patch.description = (body.description ?? body.Description) || null
      }
      if (imageUrl) patch.imageUrl = imageUrl
      if (weekSchedule) patch.weekSchedule = weekSchedule
      if (available !== undefined) patch.available = available
      if (paymentInfo !== undefined) patch.paymentInfo = paymentInfo

      if (mode === 'draft') {
        const provider = await prisma.provider.update({
          where: { id: providerId },
          data: { draft: patch },
          include: providerInclude,
        })
        return ok(res, {
          ...mapProviderProfile(provider),
          listed: provider.listed,
          draft: provider.draft ?? null,
        })
      }

      // publish: apply draft overlay onto live columns
      const provider = await prisma.provider.update({
        where: { id: providerId },
        data: {
          firstName: patch.firstName ?? existing.firstName,
          lastName: patch.lastName ?? existing.lastName,
          description: patch.description === undefined ? existing.description : patch.description,
          imageUrl: patch.imageUrl === undefined ? existing.imageUrl : patch.imageUrl,
          weekSchedule: (patch.weekSchedule as object | undefined) ?? existing.weekSchedule ?? undefined,
          available: patch.available ?? existing.available,
          paymentInfo: patch.paymentInfo === undefined ? existing.paymentInfo : (patch.paymentInfo as object),
          draft: null,
        },
        include: providerInclude,
      })
      return ok(res, {
        ...mapProviderProfile(provider),
        listed: provider.listed,
        draft: null,
      })
    }

    // Legacy / direct live update (onboarding + settings prefs that are not draftable)
    const categoryIdsRaw = body.categoryIds ?? body.CategoryIds
    const categoryIds = categoryIdsRaw ? (JSON.parse(categoryIdsRaw) as string[]) : undefined
    const weekScheduleRaw = body.weekSchedule ?? body.WeekSchedule
    const weekSchedule = weekScheduleRaw ? JSON.parse(weekScheduleRaw) : undefined
    const emailNotificationPrefs =
      parseJson(body.emailNotificationPrefs) ?? req.body?.emailNotificationPrefs
    const paymentInfo = parseJson(body.paymentInfo) ?? req.body?.paymentInfo
    const availableRaw = body.available ?? req.body?.available
    const available =
      availableRaw === undefined
        ? undefined
        : availableRaw === true || availableRaw === 'true' || availableRaw === '1'

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
        available: available ?? undefined,
        emailNotificationPrefs: emailNotificationPrefs ?? undefined,
        paymentInfo: paymentInfo === undefined ? undefined : paymentInfo,
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

    return ok(res, {
      ...mapProviderProfile(updated!),
      listed: updated!.listed,
      draft: updated!.draft ?? null,
    })
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
