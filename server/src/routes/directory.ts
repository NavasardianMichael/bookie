import { Router } from 'express'
import { ok } from '../lib/api-response.js'
import { prisma } from '../lib/prisma.js'
import { asyncHandler } from '../middleware/error.js'

export const directoryRouter = Router()

/**
 * Whether Providers, Categories and Organizations each have any row. The header hides a
 * link whose table is empty. Any row counts — an unlisted provider, a category nobody
 * uses — because "empty" here means the table, not the public page's filter.
 */
directoryRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const [provider, category, organization] = await Promise.all([
      prisma.provider.findFirst({ select: { id: true } }),
      prisma.category.findFirst({ select: { id: true } }),
      prisma.organization.findFirst({ select: { id: true } }),
    ])

    return ok(res, {
      providers: provider !== null,
      categories: category !== null,
      organizations: organization !== null,
    })
  })
)
