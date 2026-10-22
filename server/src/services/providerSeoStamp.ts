import { seoFingerprint } from './providerSeoFingerprint.js'
import { prisma } from '../lib/prisma.js'

/**
 * Moves `Provider.seoUpdatedAt` when — and only when — something search engines see on the
 * public page has changed: the sitemap's `lastmod` and the page's `dateModified`.
 *
 * Called after every write that can change those inputs (`docs/DATABASE_STRUCTURE.md` →
 * *The public page's change stamp*). Calling it after a write that changed nothing visible
 * is harmless — the fingerprint matches and nothing is written — which is why it is safe to
 * call generously and wrong to replace with a bare `seoUpdatedAt = now()`: a draft save or
 * a billing webhook would then tell crawlers the page changed when it had not.
 *
 * Best-effort, like every notice: the write it follows has committed, and a stale `lastmod`
 * is corrected by the next change. A failure is logged, never thrown.
 */
export async function refreshProviderSeoStamp(providerId: string): Promise<void> {
  try {
    const provider = await prisma.provider.findUnique({
      where: { id: providerId },
      select: {
        fullName: true,
        description: true,
        imageUrl: true,
        address: true,
        locationUrl: true,
        country: true,
        phoneVisible: true,
        weekSchedule: true,
        timeZone: true,
        listed: true,
        available: true,
        seoTitle: true,
        seoDescription: true,
        slug: true,
        ratingAvg: true,
        ratingCount: true,
        seoFingerprint: true,
        organization: { select: { name: true } },
        categories: { select: { category: { select: { name: true } } } },
        services: {
          where: { active: true },
          select: {
            name: true,
            description: true,
            durationMinutes: true,
            price: true,
            currency: true,
            availability: true,
          },
        },
      },
    })
    if (!provider) return

    const fingerprint = seoFingerprint({
      fullName: provider.fullName,
      description: provider.description,
      imageUrl: provider.imageUrl,
      address: provider.address,
      locationUrl: provider.locationUrl,
      country: provider.country,
      phoneVisible: provider.phoneVisible,
      weekSchedule: provider.weekSchedule,
      timeZone: provider.timeZone,
      listed: provider.listed,
      available: provider.available,
      seoTitle: provider.seoTitle,
      seoDescription: provider.seoDescription,
      slug: provider.slug,
      organizationName: provider.organization?.name ?? null,
      categoryNames: provider.categories.map(({ category }) => category.name),
      services: provider.services.map((service) => ({
        ...service,
        price: service.price === null ? null : service.price.toString(),
      })),
      ratingAvg: provider.ratingAvg,
      ratingCount: provider.ratingCount,
    })
    if (fingerprint === provider.seoFingerprint) return

    await prisma.provider.update({
      where: { id: providerId },
      data: { seoFingerprint: fingerprint, seoUpdatedAt: new Date() },
    })
  } catch (error) {
    console.error('[seo-stamp] could not refresh', providerId, error)
  }
}
