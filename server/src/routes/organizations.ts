import { Router } from 'express'
import { ok } from '../lib/api-response.js'
import { prisma } from '../lib/prisma.js'
import { mapBasicOrganization, mapOrganization } from '../mappers/entities.js'
import { asyncHandler, HttpError } from '../middleware/error.js'

export const organizationsRouter = Router()

/**
 * `?q=` powers the provider registration form's Organization combobox. Without it the
 * response is the full list, so existing callers are unaffected.
 */
organizationsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const query = typeof req.query.q === 'string' ? req.query.q.trim() : ''
    const orgs = await prisma.organization.findMany({
      where: query ? { name: { contains: query, mode: 'insensitive' } } : undefined,
      include: { categories: { include: { category: true } } },
      orderBy: { name: 'asc' },
      ...(query ? { take: 20 } : {}),
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
