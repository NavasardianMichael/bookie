import { Router } from 'express'
import { ok } from '../lib/api-response.js'
import { prisma } from '../lib/prisma.js'
import { mapBasicOrganization, mapOrganization } from '../mappers/entities.js'
import { asyncHandler, HttpError } from '../middleware/error.js'

export const organizationsRouter = Router()

organizationsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const orgs = await prisma.organization.findMany({
      include: { categories: { include: { category: true } } },
      orderBy: { name: 'asc' },
    })
    return ok(res, orgs.map((o) => mapBasicOrganization(o)))
  })
)

organizationsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const org = await prisma.organization.findUnique({
      where: { id: req.params.id },
      include: { categories: { include: { category: true } } },
    })
    if (!org) throw new HttpError(404, 'Organization not found', 404)
    return ok(res, mapOrganization(org))
  })
)
