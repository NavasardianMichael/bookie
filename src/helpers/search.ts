/**
 * Text matching for every search a user types into, and for telling whether two names
 * are the same thing.
 *
 * **Twin of `server/src/lib/search.ts`** — the two packages cannot import each other, so
 * the body is kept identical and `tests/unit/server/search.spec.ts` runs every case against
 * both. Change one, change the other.
 *
 * Everything compares *normalized* text: lowercase, accents stripped, punctuation read as
 * a space, whitespace trimmed and collapsed — so "Café  Nord", "cafe-nord" and "CAFE NORD"
 * are one string. On top of that, a query word may carry a typo or two (`allowedTypos`),
 * match the start of a word, and appear in any order.
 */

// Constructed rather than literal: the web package targets ES2017, where TypeScript refuses
// a `\p{…}` regex literal, and every engine this app runs on supports the escape.
const MARKS = new RegExp('\\p{M}', 'gu')
const SEPARATORS = new RegExp('[^\\p{L}\\p{N}]+', 'gu')
const APOSTROPHES = /['’`ʼ]/g

/** Lowercase, accents stripped, apostrophes dropped, other punctuation read as a space. */
export const normalizeSearchText = (text: string): string =>
  text.normalize('NFKD').replace(MARKS, '').toLowerCase().replace(APOSTROPHES, '').replace(SEPARATORS, ' ').trim()

/** Trimmed, with runs of whitespace collapsed to one space — how a typed name is stored. */
export const collapseWhitespace = (text: string): string => text.trim().replace(/\s+/g, ' ')

export const toSearchWords = (text: string): string[] => {
  const normalized = normalizeSearchText(text)
  return normalized ? normalized.split(' ') : []
}

/** Typos a word of this length may carry and still match — Elasticsearch's `AUTO`. */
export const allowedTypos = (length: number): number => (length < 3 ? 0 : length < 6 ? 1 : 2)

/**
 * Optimal-string-alignment distance: Levenshtein plus a swap of two neighbours as one edit.
 * Capped — anything further than `max` returns `max + 1`, and the row loop stops early.
 */
export const editDistance = (a: string, b: string, max: number): number => {
  const left = [...a]
  const right = [...b]
  if (Math.abs(left.length - right.length) > max) return max + 1

  let beforePrevious: number[] = []
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index)

  for (let i = 1; i <= left.length; i++) {
    const current = [i]
    let rowMin = i
    for (let j = 1; j <= right.length; j++) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1
      let value = Math.min(previous[j]! + 1, current[j - 1]! + 1, previous[j - 1]! + cost)
      if (i > 1 && j > 1 && left[i - 1] === right[j - 2] && left[i - 2] === right[j - 1]) {
        value = Math.min(value, beforePrevious[j - 2]! + 1)
      }
      current.push(value)
      rowMin = Math.min(rowMin, value)
    }
    if (rowMin > max) return max + 1
    beforePrevious = previous
    previous = current
  }

  return Math.min(previous[right.length]!, max + 1)
}

/**
 * One query word against one candidate word: its start, within `allowedTypos` of it, or —
 * for a word still being typed, four letters or more — within them of its start.
 */
export const wordMatch = (queryWord: string, word: string): 'prefix' | 'fuzzy' | null => {
  if (word.startsWith(queryWord)) return 'prefix'
  const typos = allowedTypos(queryWord.length)
  if (!typos) return null
  if (editDistance(queryWord, word, typos) <= typos) return 'fuzzy'
  if (queryWord.length >= 4 && word.length > queryWord.length) {
    if (editDistance(queryWord, word.slice(0, queryWord.length), typos) <= typos) return 'fuzzy'
  }
  return null
}

/**
 * How well `candidate` answers `query`, from 0 (not at all) to 1 (the same text):
 *
 * | 1 | same | .95 | same without spaces | .9 | starts with it | .8 | a word starts with it |
 * | .7 | contains it | .4–.6 | every query word matches some word, in any order, by prefix or typo |
 *
 * Within the last band, prefix hits score higher than typo hits.
 */
export const matchScore = (candidate: string, query: string): number => {
  const q = normalizeSearchText(query)
  const c = normalizeSearchText(candidate)
  if (!q || !c) return 0
  if (c === q) return 1

  const squashedQuery = q.replace(/ /g, '')
  const squashedCandidate = c.replace(/ /g, '')
  if (squashedCandidate === squashedQuery) return 0.95
  if (c.startsWith(q)) return 0.9
  if (` ${c}`.includes(` ${q}`)) return 0.8
  if (c.includes(q) || squashedCandidate.includes(squashedQuery)) return 0.7

  const words = c.split(' ')
  const queryWords = q.split(' ')
  let prefixHits = 0
  for (const queryWord of queryWords) {
    const hits = words.map((word) => wordMatch(queryWord, word))
    if (hits.includes('prefix')) prefixHits += 1
    else if (!hits.includes('fuzzy')) return 0
  }
  return 0.4 + (0.2 * prefixHits) / queryWords.length
}

/** For a filter: an empty query keeps everything. */
export const matchesSearch = (candidate: string, query: string): boolean =>
  !normalizeSearchText(query) || matchScore(candidate, query) > 0

/** Best match first, non-matches dropped; equal scores keep their input order. */
export const rankBySearch = <T>(items: readonly T[], toText: (item: T) => string, query: string): T[] =>
  items
    .map((item, index) => ({ item, index, score: matchScore(toText(item), query) }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map((entry) => entry.item)

/**
 * The same name whatever the case, accents, punctuation, spacing or word order — "Acme
 * Dental", "acme-dental", "AcmeDental", "Dental Acme". Strict enough to act on silently.
 */
export const isSameName = (a: string, b: string): boolean => {
  const left = toSearchWords(a)
  const right = toSearchWords(b)
  if (!left.length || !right.length) return false
  if (left.join('') === right.join('')) return true
  return left.length === right.length && [...left].sort().join(' ') === [...right].sort().join(' ')
}

/**
 * Probably the same thing: the same name, a typo or two apart, or the same words plus one
 * ("Acme Dental" / "Acme Dental Clinic"). Loose on purpose — only ever a question to the
 * user, never acted on without one.
 */
export const isSimilarName = (a: string, b: string): boolean => {
  if (isSameName(a, b)) return true
  const left = toSearchWords(a)
  const right = toSearchWords(b)
  if (!left.length || !right.length) return false

  const squashedLeft = left.join('')
  const squashedRight = right.join('')
  const typos = allowedTypos(Math.min(squashedLeft.length, squashedRight.length))
  if (typos && editDistance(squashedLeft, squashedRight, typos) <= typos) return true

  const [shorter, longer] = left.length <= right.length ? [left, right] : [right, left]
  return shorter.length >= 2 && longer.length - shorter.length === 1 && shorter.every((word) => longer.includes(word))
}
