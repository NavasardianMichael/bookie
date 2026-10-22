import { looksLikeProviderId } from './providerSeo.js'
import { prisma } from '../lib/prisma.js'

/**
 * The provider a public page key names — the `<key>` of `/p/<key>`, which is the provider's
 * id, their current slug, or a slug they have since given up.
 *
 * In that order. An id and a slug cannot collide, because a slug is refused when it is
 * UUID-shaped (`providerSeo.ts#parseSlug`), and a current slug outranks a remembered one, so
 * a provider who claims a slug another provider gave up takes the address over. Remembering
 * old slugs is what keeps a shared link, a printed QR code or an indexed URL working after a
 * rename; the page it opens names the current slug as its canonical.
 *
 * Each step is a unique-index hit. `null` is "no such page".
 */
export async function resolveProviderId(key: string): Promise<string | null> {
  const segment = key.trim()
  if (!segment) return null
  if (looksLikeProviderId(segment)) return segment.toLowerCase()

  const slug = segment.toLowerCase()
  const current = await prisma.provider.findUnique({ where: { slug }, select: { id: true } })
  if (current) return current.id

  const previous = await prisma.providerSlugHistory.findUnique({ where: { slug }, select: { providerId: true } })
  return previous?.providerId ?? null
}
