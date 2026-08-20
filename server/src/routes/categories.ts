import { Router } from 'express'
import { ok } from '../lib/api-response.js'
import { prisma } from '../lib/prisma.js'
import {
  mapBasicOrganization,
  mapBasicProvider,
  mapCategoryDetail,
  providerInclude,
} from '../mappers/entities.js'
import { asyncHandler, HttpError } from '../middleware/error.js'

export const categoriesRouter = Router()

categoriesRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } })
    const result = await Promise.all(
      categories.map(async (category) => {
        const orgLinks = await prisma.organizationCategory.findMany({
          where: { categoryId: category.id },
          include: { organization: { include: { categories: { include: { category: true } } } } },
        })
        const provLinks = await prisma.providerCategory.findMany({
          where: { categoryId: category.id },
          include: { provider: { include: providerInclude } },
        })
        return mapCategoryDetail(
          category,
          orgLinks.map((l) => mapBasicOrganization(l.organization)),
          provLinks.map((l) => mapBasicProvider(l.provider))
        )
      })
    )
    return ok(res, result.map((c) => ({ ...c, organizations: c.organizations, providers: c.providers })))
  })
)

categoriesRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const category = await prisma.category.findUnique({ where: { id: req.params.id } })
    if (!category) throw new HttpError(404, 'Category not found', 404)

    const orgLinks = await prisma.organizationCategory.findMany({
      where: { categoryId: category.id },
      include: { organization: { include: { categories: { include: { category: true } } } } },
    })
    const provLinks = await prisma.providerCategory.findMany({
      where: { categoryId: category.id },
      include: { provider: { include: providerInclude } },
    })

    return ok(
      res,
      mapCategoryDetail(
        category,
        orgLinks.map((l) => mapBasicOrganization(l.organization)),
        provLinks.map((l) => mapBasicProvider(l.provider))
      )
    )
  })
)
