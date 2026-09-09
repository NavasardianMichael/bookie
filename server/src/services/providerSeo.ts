import { HttpError } from '../middleware/error.js'

/**
 * Validation for the provider SEO tab — the whole point of this file.
 *
 * This server carries no schema validator by design (`lib/request.ts`), so the rules
 * live here as plain functions: testable without a database or an Express request, and
 * kept out of the route so the handler stays a delegate.
 *
 * Every field is an **override**. `undefined` means "not sent, leave it alone" and `''`
 * means "clear it, go back to the composed default" — the `''` convention the API layer
 * already uses for clearable fields (`src/api/CLAUDE.md`). Nothing here can blank a tag:
 * a cleared override restores what `generateMetadata` composes from the provider's name,
 * organization and categories.
 */

/**
 * Google renders roughly 580px of title, which is about 60 characters of Latin text.
 * The exact pixel budget is not knowable server-side and varies by script, so this is
 * an advisory cap enforced as a hard one — a title that is certainly truncated is worse
 * than a rejected edit, because the provider never finds out.
 */
export const MAX_SEO_TITLE = 60

/** Same reasoning, for the ~160 characters of description a result snippet shows. */
export const MAX_SEO_DESCRIPTION = 160

export const MAX_SEO_KEYWORDS = 10
export const MAX_SEO_KEYWORD_LENGTH = 40
export const MAX_SEO_KEYWORDS_JOINED = 255

export const MIN_SLUG_LENGTH = 3
export const MAX_SLUG_LENGTH = 40

/**
 * Locale codes, duplicated from `src/i18n/config.ts`.
 *
 * `server/` is a separate package with no import path into `src/` — `lib/payment.ts` is
 * the established twin of `src/helpers/payment.ts` for the same reason. If a locale is
 * added there, add it here: `tests/unit/server/providerSeo.spec.ts` asserts this list
 * still covers `LOCALES`, so the omission fails the suite rather than shipping a slug
 * that shadows a language.
 */
const LOCALE_SLUGS = [
  'en',
  'es',
  'pt-br',
  'fr',
  'it',
  'de',
  'ar',
  'zh-cn',
  'ja',
  'hy',
  'id',
  'ko',
  'uk',
  'pl',
  'th',
] as const

/**
 * Slugs nobody may claim.
 *
 * Three groups, all for the same reason — a slug becomes a URL segment, and a segment
 * that collides with a real one is a route hijack rather than a vanity link:
 *
 * 1. every first path segment in the app's own route table;
 * 2. every locale code, since `/<locale>/…` is how every page in the app is addressed;
 * 3. the infrastructure names a visitor would read as ours rather than a provider's.
 */
export const RESERVED_SLUGS: ReadonlySet<string> = new Set<string>([
  // Route segments — mirrors `ROUTES` in `src/constants/routes.ts`.
  'p',
  'providers',
  'provider-categories',
  'profile',
  'categories',
  'organizations',
  'consumers',
  'auth',
  'contact',
  'terms',
  'privacy',
  'routes-overview',
  // Locale codes.
  ...LOCALE_SLUGS,
  // Ours, not a provider's.
  'admin',
  'api',
  'www',
  'app',
  'assets',
  'static',
  'uploads',
  'support',
  'help',
  'about',
  'login',
  'logout',
  'signup',
  'register',
  'settings',
  'account',
  'billing',
  'bookie',
])

/**
 * Code-point ranges that must not survive into a rendered tag, as numbers rather than a
 * regex character class: a class of raw control characters has to be written as escapes,
 * and an escape that slips through as a literal puts a NUL byte in this source file.
 *
 * They fall into two groups that need **different** treatment, which is the whole reason
 * this is a table rather than one filter.
 */

/**
 * Line and field breaks. Replaced with a space, never deleted: a description typed across
 * two lines is two words, and deleting the newline would join them into one
 * ("Acme\nHair" must not become "AcmeHair").
 */
const BREAK_RANGES: readonly (readonly [number, number])[] = [
  [0x09, 0x0d], // tab, LF, VT, FF, CR
  [0x2028, 0x2029], // line and paragraph separators
]

/**
 * Everything else invisible. Deleted outright, because these sit *inside* a word and a
 * space would break it apart.
 *
 * The remaining C0/C1 controls go because a control character inside a
 * `<meta content="...">` is the attribute-injection shape. The bidi controls and
 * zero-width characters go for a different reason: they let a string render in an order,
 * or with word boundaries, that the stored text does not have. In a search result —
 * exactly where a reader decides whether a link is trustworthy — that is a spoofing
 * primitive rather than formatting.
 */
const DELETE_RANGES: readonly (readonly [number, number])[] = [
  [0x00, 0x08], // C0 before tab
  [0x0e, 0x1f], // C0 after CR
  [0x7f, 0x9f], // DEL and C1 controls
  [0x200b, 0x200f], // zero-width space/joiners, LTR/RTL marks
  [0x202a, 0x202e], // bidi embedding and override
  [0x2066, 0x2069], // bidi isolates
  [0xfeff, 0xfeff], // zero-width no-break space (BOM)
]

const inRanges = (codePoint: number, ranges: readonly (readonly [number, number])[]): boolean =>
  ranges.some(([low, high]) => codePoint >= low && codePoint <= high)

/**
 * Replace breaks with a space and delete the rest.
 *
 * Iterated with a spread so an astral character is one element and cannot be split into
 * surrogates that then fail the range test on their own. The caller collapses the
 * whitespace runs this can leave behind.
 */
const stripInvisible = (value: string): string =>
  [...value]
    .map((character) => {
      const codePoint = character.codePointAt(0) ?? 0
      if (inRanges(codePoint, BREAK_RANGES)) return ' '
      return inRanges(codePoint, DELETE_RANGES) ? '' : character
    })
    .join('')

/** Runs of any whitespace collapse to one space — a title is a single line. */
const WHITESPACE_RUN = /\s+/g

/**
 * `a-b-c`: lowercase alphanumerics with single hyphens between them.
 *
 * Written as one flat character class plus three explicit checks rather than the obvious
 * `^[a-z0-9]+(?:-[a-z0-9]+)*$`. That form is in fact linear — the group can only start at
 * a `-`, which the preceding class cannot match — but it reads as a nested quantifier and
 * `security/detect-unsafe-regex` flags it. Since a validator for a user-supplied string is
 * the wrong place to be arguing with a ReDoS linter, the shape is stated directly instead.
 */
const SLUG_CHARS = /^[a-z0-9-]+$/

const isWellFormedSlug = (value: string): boolean =>
  SLUG_CHARS.test(value) && !value.startsWith('-') && !value.endsWith('-') && !value.includes('--')

/**
 * A UUID passes `SLUG_PATTERN` — it is hex in hyphen-separated groups — so without this
 * a provider could take another provider's id as their own slug. `GET /providers/:idOrSlug`
 * resolves an id before a slug, so the impostor slug would never win the lookup, but the
 * URL would still read as somebody else's canonical profile address. Refused outright
 * rather than defended against downstream.
 */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

/** Characters that must never reach a rendered tag, even though Next escapes metadata. */
const MARKUP_CHARS = /[<>]/

/** Length in code points, not UTF-16 units — an emoji or a CJK ideograph is one character to a reader. */
const charCount = (value: string): number => [...value].length

/**
 * Normalise a free-text SEO field, or throw with the field's own name in the message.
 *
 * **Rejected, not truncated**, deviating from `asBoundedString`'s house rule. The rule
 * is "cap where the length is not itself a signal"; here it is one. The field is counted
 * live in the browser against the same cap, so an over-length body means a non-browser
 * caller — and silently dropping the tail is how a description reaches Google mid-word.
 */
const parseText = (value: unknown, field: string, max: number): string | null | undefined => {
  if (value === undefined) return undefined
  if (value === null) return null
  if (typeof value !== 'string') {
    throw new HttpError(400, `${field} must be a string`, 400)
  }

  const cleaned = stripInvisible(value.normalize('NFC')).replace(WHITESPACE_RUN, ' ').trim()

  // Cleared: an empty override restores the composed default rather than blanking the tag.
  if (!cleaned) return null

  if (MARKUP_CHARS.test(cleaned)) {
    throw new HttpError(400, `${field} must not contain < or >`, 400)
  }
  if (charCount(cleaned) > max) {
    throw new HttpError(400, `${field} must be ${max} characters or fewer`, 400)
  }

  return cleaned
}

/**
 * Keywords arrive as an array from the tag input and are stored comma-joined, which is
 * the shape the `<meta>` tag wants. A string is accepted too so a hand-written request
 * behaves the same as the UI's.
 */
const parseKeywords = (value: unknown): string | null | undefined => {
  if (value === undefined) return undefined
  if (value === null) return null

  const raw = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : null
  if (!raw) throw new HttpError(400, 'seoKeywords must be an array of strings', 400)

  const keywords: string[] = []
  for (const entry of raw) {
    if (typeof entry !== 'string') {
      throw new HttpError(400, 'seoKeywords must be an array of strings', 400)
    }
    // A comma is the storage separator, so it cannot survive inside one keyword —
    // replacing it keeps the round-trip honest instead of splitting the word later.
    const cleaned = stripInvisible(entry.normalize('NFC'))
      .replace(/,/g, ' ')
      .replace(WHITESPACE_RUN, ' ')
      .trim()

    if (!cleaned) continue
    if (MARKUP_CHARS.test(cleaned)) {
      throw new HttpError(400, 'seoKeywords must not contain < or >', 400)
    }
    if (charCount(cleaned) > MAX_SEO_KEYWORD_LENGTH) {
      throw new HttpError(400, `Each keyword must be ${MAX_SEO_KEYWORD_LENGTH} characters or fewer`, 400)
    }
    // Case-insensitive dedupe: two spellings of one keyword help nothing and spend the cap.
    if (!keywords.some((existing) => existing.toLowerCase() === cleaned.toLowerCase())) {
      keywords.push(cleaned)
    }
  }

  if (!keywords.length) return null
  if (keywords.length > MAX_SEO_KEYWORDS) {
    throw new HttpError(400, `At most ${MAX_SEO_KEYWORDS} keywords`, 400)
  }

  const joined = keywords.join(', ')
  if (joined.length > MAX_SEO_KEYWORDS_JOINED) {
    throw new HttpError(400, `Keywords must be ${MAX_SEO_KEYWORDS_JOINED} characters or fewer in total`, 400)
  }

  return joined
}

/**
 * Validate a vanity slug.
 *
 * **ASCII only, and that is a security rule rather than a simplification.** Allowing
 * Unicode would let a Cyrillic `a` (U+0430) or a Greek `o` (U+03BF) produce a slug that
 * renders identically to another provider's — a homograph attack against a URL people
 * are asked to trust. Punycode would make the difference visible in the address bar and
 * invisible in a printed link or a text message, which is where a vanity URL is actually
 * read.
 *
 * Uniqueness is **not** checked here: two requests can both pass validation at the same
 * moment and only the unique index can settle it. The caller catches Prisma's `P2002`.
 */
const parseSlug = (value: unknown): string | null | undefined => {
  if (value === undefined) return undefined
  if (value === null) return null
  if (typeof value !== 'string') throw new HttpError(400, 'slug must be a string', 400)

  const cleaned = value.trim().toLowerCase()
  if (!cleaned) return null

  if (cleaned.length < MIN_SLUG_LENGTH || cleaned.length > MAX_SLUG_LENGTH) {
    throw new HttpError(
      400,
      `Your link must be between ${MIN_SLUG_LENGTH} and ${MAX_SLUG_LENGTH} characters`,
      400
    )
  }
  if (!isWellFormedSlug(cleaned)) {
    throw new HttpError(
      400,
      'Your link may use only lowercase letters, numbers and single hyphens between them',
      400
    )
  }
  if (UUID_PATTERN.test(cleaned)) {
    throw new HttpError(400, 'Your link cannot look like a profile id', 400)
  }
  if (RESERVED_SLUGS.has(cleaned)) {
    throw new HttpError(409, 'That link is reserved. Please choose another.', 409)
  }

  return cleaned
}

/**
 * Does this path segment name a provider by id, or by slug?
 *
 * `GET /providers/:idOrSlug` serves both so a vanity link resolves without a second
 * endpoint. Ids are checked first and slugs can never be UUID-shaped (above), so the two
 * namespaces cannot overlap and one segment always has exactly one meaning.
 */
export const looksLikeProviderId = (value: string): boolean => UUID_PATTERN.test(value.trim().toLowerCase())

export type ProviderSeoPatch = {
  seoTitle?: string | null
  seoDescription?: string | null
  seoKeywords?: string | null
  slug?: string | null
}

/**
 * Read a `PATCH /provider-profile/seo` body into the columns to write.
 *
 * Absent keys are omitted from the result entirely, so a request that sends only `slug`
 * cannot clear a title the provider is not editing. Prisma treats an omitted key as
 * "leave it" and an explicit `null` as "set it to null", which is exactly the
 * three-state contract this returns.
 */
export function parseProviderSeoBody(body: unknown): ProviderSeoPatch {
  const source = (body ?? {}) as Record<string, unknown>

  const seoTitle = parseText(source.seoTitle, 'seoTitle', MAX_SEO_TITLE)
  const seoDescription = parseText(source.seoDescription, 'seoDescription', MAX_SEO_DESCRIPTION)
  const seoKeywords = parseKeywords(source.seoKeywords)
  const slug = parseSlug(source.slug)

  return {
    ...(seoTitle !== undefined ? { seoTitle } : {}),
    ...(seoDescription !== undefined ? { seoDescription } : {}),
    ...(seoKeywords !== undefined ? { seoKeywords } : {}),
    ...(slug !== undefined ? { slug } : {}),
  }
}
