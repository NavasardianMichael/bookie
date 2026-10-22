import { createHash } from 'node:crypto'

/**
 * Everything the public provider page shows a search engine or an AI crawler: the head
 * tags (title, description, keywords, canonical), the visible text, and the JSON-LD. Auto-
 * composed values are derived from these inputs, so fingerprinting the inputs covers them
 * too — a new service name changes the composed description without anyone touching the
 * SEO tab.
 *
 * Pure and import-free beyond `node:crypto`, so `tests/unit/server/` can reach it. The I/O
 * half, which loads these fields and writes the stamp, is `providerSeoStamp.ts`.
 */
export type ProviderSeoInput = {
  fullName: string
  description: string | null
  imageUrl: string | null
  address: string | null
  locationUrl: string | null
  country: string | null
  phoneVisible: boolean
  weekSchedule: unknown
  timeZone: string | null
  listed: boolean
  available: boolean
  seoTitle: string | null
  seoDescription: string | null
  slug: string | null
  organizationName: string | null
  categoryNames: readonly string[]
  /** Active services only — a withdrawn one is on no public payload. */
  services: readonly {
    name: string
    description: string | null
    durationMinutes: number
    price: string | null
    currency: string | null
    availability: unknown
  }[]
  ratingAvg: number
  ratingCount: number
}

/** JSON with object keys sorted at every depth, so a reordered `Json` column hashes the same. */
const stableStringify = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
    return `{${entries.map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`).join(',')}}`
  }
  return JSON.stringify(value ?? null)
}

/**
 * A sha256 over the inputs. Category names are sorted (their order on the page is not a
 * change); services are sorted by name then the rest, since rows come back in no fixed order.
 */
export function seoFingerprint(input: ProviderSeoInput): string {
  const normalised = {
    ...input,
    categoryNames: [...input.categoryNames].sort(),
    services: [...input.services].map(stableStringify).sort(),
  }
  return createHash('sha256').update(stableStringify(normalised)).digest('hex')
}
