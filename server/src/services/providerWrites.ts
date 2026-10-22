import type { Prisma } from '@prisma/client'

type Db = Prisma.TransactionClient

/**
 * Provider writes that more than one route makes — the SEO tab and the profile assistant both
 * move a slug — kept in one place so the two cannot drift. Each takes the transaction client:
 * it belongs inside the write that changes the provider row.
 */

/**
 * The slug history around a slug change. A slug given up is remembered
 * (`ProviderSlugHistory`), so `/p/<old>` keeps opening the page. A slug being claimed is
 * forgotten by whoever held it before — only a *current* slug blocks a claim (the unique
 * index, which the caller catches as `P2002`), so a provider can take over a link another one
 * abandoned. Nothing happens when the slug is unchanged.
 */
export const recordSlugChange = async (
  tx: Db,
  providerId: string,
  previousSlug: string | null,
  nextSlug: string | null
): Promise<void> => {
  if (nextSlug === previousSlug) return
  if (nextSlug) await tx.providerSlugHistory.deleteMany({ where: { slug: nextSlug } })
  if (previousSlug) {
    await tx.providerSlugHistory.upsert({
      where: { slug: previousSlug },
      create: { slug: previousSlug, providerId },
      update: { providerId },
    })
  }
}
