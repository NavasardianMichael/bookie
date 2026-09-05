import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { DEFAULT_LOCALE, LOCALE_LABELS, LOCALES } from '@i18n/config'

const MESSAGES_DIR = join(process.cwd(), 'src', 'messages')

type Catalogue = { [key: string]: string | Catalogue }

// The path is built from LOCALES — a compile-time `as const` tuple — and a directory
// constant, so no caller-supplied input reaches the filesystem here.
const read = (locale: string): Catalogue =>
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  JSON.parse(readFileSync(join(MESSAGES_DIR, `${locale}.json`), 'utf8')) as Catalogue

/** `Nav.home`, `Footer.rights`, … — the shape `t()` actually addresses. */
const flatten = (catalogue: Catalogue, prefix = ''): string[] =>
  Object.entries(catalogue).flatMap(([key, value]) =>
    typeof value === 'object' && value !== null ? flatten(value, `${prefix}${key}.`) : [`${prefix}${key}`]
  )

/** `{year}`, `{count}` — every locale must interpolate the same arguments. */
const placeholders = (catalogue: Catalogue): Map<string, Set<string>> => {
  const found = new Map<string, Set<string>>()

  const walk = (node: Catalogue, prefix = '') => {
    for (const [key, value] of Object.entries(node)) {
      if (typeof value === 'object' && value !== null) {
        walk(value, `${prefix}${key}.`)
      } else if (typeof value === 'string') {
        const names = [...value.matchAll(/\{(\w+)/g)].map((match) => match[1] as string)
        found.set(`${prefix}${key}`, new Set(names))
      }
    }
  }

  walk(catalogue)
  return found
}

const english = read(DEFAULT_LOCALE)
const englishKeys = flatten(english).sort()
const englishPlaceholders = placeholders(english)

describe('message catalogues', () => {
  it('ships exactly one file per declared locale, and no orphans', () => {
    const onDisk = readdirSync(MESSAGES_DIR)
      .filter((file) => file.endsWith('.json'))
      .map((file) => file.replace(/\.json$/, ''))
      .sort()

    expect(onDisk).toEqual([...LOCALES].sort())
  })

  it('gives every locale a native label for the switcher', () => {
    for (const locale of LOCALES) {
      expect(LOCALE_LABELS[locale]?.trim()).toBeTruthy()
    }
  })

  // A missing key must fail here rather than falling back silently at runtime —
  // a silent fallback ships a half-English screen that nobody notices.
  describe.each(LOCALES.filter((locale) => locale !== DEFAULT_LOCALE))('%s', (locale) => {
    const catalogue = read(locale)

    it('has exactly the keys en.json has', () => {
      expect(flatten(catalogue).sort()).toEqual(englishKeys)
    })

    it('interpolates the same placeholders as en.json', () => {
      const actual = placeholders(catalogue)

      for (const [key, expected] of englishPlaceholders) {
        expect([...(actual.get(key) ?? [])].sort(), `${locale} → ${key}`).toEqual([...expected].sort())
      }
    })

    it('leaves no message empty', () => {
      const walk = (node: Catalogue, prefix = '') => {
        for (const [key, value] of Object.entries(node)) {
          if (typeof value === 'object' && value !== null) walk(value, `${prefix}${key}.`)
          else expect(String(value).trim(), `${locale} → ${prefix}${key}`).not.toBe('')
        }
      }

      walk(catalogue)
    })
  })
})
