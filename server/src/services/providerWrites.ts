import type { Prisma } from '@prisma/client'
import type { TimeFormat } from '../lib/time-format.js'

type Db = Prisma.TransactionClient

/**
 * The unpublished-edits overlay (`Provider.draft`). **Deliberately has no `email` key**, and the
 * profile route builds it by explicit per-field assignments rather than by spreading the request
 * body — so an `email` sent to that route cannot reach the draft JSON and reappear at publish
 * time. Do not add one: identity email changes belong to `/identity/change-email/*`.
 */
export type ProviderDraft = {
  fullName?: string
  description?: string | null
  imageUrl?: string | null
  weekSchedule?: unknown
  /** Drafted with `weekSchedule`: the dates that do not follow it. */
  specialDates?: unknown
  /** Drafted with `weekSchedule`: which base the hours follow (weekly, days of the month, dates). */
  scheduleRule?: unknown
  /** Drafted with `weekSchedule`: it decides what instant every one of those hours is. */
  timeZone?: string
  /** Drafted with `timeZone`, beside which it is edited; it changes what the public page prints. */
  timeFormat?: TimeFormat
  /** Drafted with `timeFormat`. One flag for the visitor's time-zone list and 12/24-hour switch. */
  showClockChoices?: boolean
  available?: boolean
  paymentInfo?: unknown
}

/**
 * The draft after a **live** write of draftable fields: every key the draft already holds takes
 * the value just written, so the next Publish cannot put the old one back. Keys the draft does
 * not hold stay out — a live write is not an edit the provider staged. `undefined` in `written`
 * is "not written". Answers `undefined` when the draft needs no change, `null` when nothing is
 * left in it.
 *
 * Pure. Used by the live profile write and `PATCH /provider-profile/availability` — the AI
 * assistant and the service-conflict dialog both publish a schedule change at once, and the
 * provider may have an unpublished Availability draft open at the time.
 */
export const syncDraft = (
  stored: unknown,
  written: { [K in keyof ProviderDraft]?: ProviderDraft[K] }
): ProviderDraft | null | undefined => {
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return undefined
  const draft = { ...(stored as ProviderDraft) } as Record<string, unknown>
  let changed = false
  for (const [key, value] of Object.entries(written)) {
    if (value === undefined || !(key in draft)) continue
    draft[key] = value
    changed = true
  }
  if (!changed) return undefined
  return Object.keys(draft).length ? (draft as ProviderDraft) : null
}

/**
 * Provider writes that more than one route makes, kept in one place so the routes cannot drift. Each takes the transaction client:
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
