import { allowedTypos, editDistance, normalizeSearchText } from './search.js'

/**
 * Typo and accent tolerance for the SQL-backed searches — Explore and both bookings lists.
 *
 * Those match each query word with `ILIKE '%word%'`, which is case-insensitive but neither
 * typo- nor accent-tolerant, and a fuzzy `WHERE` needs `pg_trgm`, an extension this deploy
 * does not assume. So a search that finds **nothing** is retried once, with each unknown
 * word allowed to match any of its closest known spellings as well as itself. The first
 * query is untouched, so an exact search costs nothing extra.
 */

/**
 * The words a search can land on, keyed by normalized form, each with the spelling to put
 * back into the query — lowercased but with its accents, because `ILIKE` compares against
 * the stored text.
 */
export type SearchVocabulary = ReadonlyMap<string, string>

/** One query word as the retry matches it: itself, or any of these spellings. */
export type TermSpellings = readonly string[]

/** Enough for a short word's several near neighbours ("ana" → anna, ani), few enough to stay one query. */
const MAX_SPELLINGS_PER_TERM = 5

// Apostrophes stay inside a word, as `normalizeSearchText` drops rather than splits on them.
const WORD_BREAK = new RegExp("[^\\p{L}\\p{N}\\p{M}'’]+", 'u')

export const buildSearchVocabulary = (texts: Iterable<string | null | undefined>): Map<string, string> => {
  const vocabulary = new Map<string, string>()
  for (const text of texts) {
    if (!text) continue
    for (const spelling of text.toLowerCase().split(WORD_BREAK)) {
      const normalized = normalizeSearchText(spelling)
      if (normalized.length >= 2 && !normalized.includes(' ') && !vocabulary.has(normalized)) {
        vocabulary.set(normalized, spelling)
      }
    }
  }
  return vocabulary
}

/**
 * Known spellings `raw` might have meant, without the ones `ILIKE` already tried: every
 * spelling that contains `raw` matched on the first query.
 *
 * - the same word with its accents ("jose" → "josé"), or a word starting with it
 *   ("martin" → "martínez");
 * - failing that, every word the fewest typos away, whole or — for a word still being
 *   typed, four letters or more — by its start ("masa" → "massage"). A start-only match
 *   ranks half an edit behind a whole one, so "masage" finds "massage", not "manage…".
 */
const spellingsFor = (raw: string, normalized: string, vocabulary: SearchVocabulary): string[] => {
  const accented: string[] = []
  let closest: { spellings: string[]; distance: number } | undefined
  const typos = allowedTypos(normalized.length)

  for (const [known, spelling] of vocabulary) {
    if (spelling.includes(raw)) continue
    if (known.startsWith(normalized)) {
      accented.push(spelling)
      continue
    }
    if (!typos) continue

    const whole = editDistance(normalized, known, typos)
    const start =
      normalized.length >= 4 && known.length > normalized.length
        ? editDistance(normalized, known.slice(0, normalized.length), typos)
        : typos + 1
    if (Math.min(whole, start) > typos) continue
    const distance = whole <= start ? whole : start + 0.5
    if (!closest || distance < closest.distance) closest = { spellings: [spelling], distance }
    else if (distance === closest.distance) closest.spellings.push(spelling)
  }

  return (accented.length ? accented : (closest?.spellings ?? [])).slice(0, MAX_SPELLINGS_PER_TERM)
}

/**
 * The spellings to retry each query word with, or `null` when none would change — the
 * caller must not repeat an identical query.
 *
 * A word that is itself a known word, spelled as typed, is kept alone: the empty result
 * came from another word or a filter. Any other word keeps itself and gains its closest
 * known spellings (`spellingsFor`). Offering several rather than betting on one matters
 * because every word must match the same row: "ana petrosian" needs "anna", not "ani",
 * and only the rows can say which.
 */
export const correctSearchTerms = (terms: readonly string[], vocabulary: SearchVocabulary): TermSpellings[] | null => {
  let changed = false

  const corrected = terms.map((term): TermSpellings => {
    const raw = term.toLowerCase()
    const normalized = normalizeSearchText(term)
    if (!normalized || normalized.includes(' ') || vocabulary.get(normalized) === raw) return [term]

    const spellings = spellingsFor(raw, normalized, vocabulary)
    if (!spellings.length) return [term]
    changed = true
    return [term, ...spellings]
  })

  return changed ? corrected : null
}
