import { Router } from 'express'
import { ok } from '../lib/api-response.js'
import { prisma } from '../lib/prisma.js'
import { requireAuth, requireConsumer } from '../middleware/auth.js'
import { asyncHandler, HttpError } from '../middleware/error.js'
import { createAppointment } from '../services/appointments.js'

export const appointmentsRouter = Router()

appointmentsRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const where =
      req.session!.role === 'consumer'
        ? { consumerId: req.session!.profileId }
        : { providerId: req.session!.profileId }

    const appointments = await prisma.appointment.findMany({
      where,
      include: { service: true, provider: true, consumer: true },
      orderBy: { startAt: 'asc' },
    })

    return ok(
      res,
      appointments.map((a) => ({
        id: a.id,
        consumerId: a.consumerId,
        providerId: a.providerId,
        serviceId: a.serviceId,
        organizationId: a.organizationId ?? undefined,
        time: {
          startDate: a.startAt.toISOString(),
          endDate: a.endAt.toISOString(),
          duration: a.durationMinutes,
        },
        status: a.status,
        notes: a.notes ?? undefined,
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
      }))
    )
  })
)

appointmentsRouter.post(
  '/',
  requireConsumer,
  asyncHandler(async (req, res) => {
    const { providerId, serviceId, startAt, notes } = req.body ?? {}
    if (!providerId || !serviceId || !startAt) {
      throw new HttpError(400, 'providerId, serviceId, and startAt required', 400)
    }

    const appointment = await createAppointment({
      consumerId: req.session!.profileId,
      providerId,
      serviceId,
      startAt: new Date(startAt),
      notes,
    })

    return ok(
      res,
      {
        id: appointment.id,
        consumerId: appointment.consumerId,
        providerId: appointment.providerId,
        serviceId: appointment.serviceId,
        time: {
          startDate: appointment.startAt.toISOString(),
          endDate: appointment.endAt.toISOString(),
          duration: appointment.durationMinutes,
        },
        status: appointment.status,
      },
      201
    )
  })
)

appointmentsRouter.patch(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const appointment = await prisma.appointment.findUnique({ where: { id: req.params.id } })
    if (!appointment) throw new HttpError(404, 'Appointment not found', 404)

    const isOwner =
      (req.session!.role === 'consumer' && appointment.consumerId === req.session!.profileId) ||
      (req.session!.role === 'provider' && appointment.providerId === req.session!.profileId)

    if (!isOwner) throw new HttpError(403, 'Forbidden', 403)

    const status = req.body?.status ?? 'cancelled'
    const updated = await prisma.appointment.update({
      where: { id: appointment.id },
      data: { status },
    })

    return ok(res, { id: updated.id, status: updated.status })
  })
)
