import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { LOCALES } from '@i18n/config'
import {
  SEEDED_CATEGORY_MESSAGE_KEYS,
  SEEDED_CATEGORY_NAMES as WEB_SEEDED_CATEGORY_NAMES,
} from '@constants/categories'
import {
  categoryLabels,
  SEEDED_CATEGORY_LABELS,
  SEEDED_CATEGORY_NAMES,
  seededCategoriesMatching,
} from '../../../server/src/lib/category-names'

type CategoryNames = Record<string, string>

// Built from LOCALES — a compile-time `as const` tuple — and a fixed directory, so no
// caller-supplied input reaches the filesystem.
const categoryNamesIn = (locale: string): CategoryNames =>
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  (JSON.parse(readFileSync(join(process.cwd(), 'src', 'messages', `${locale}.json`), 'utf8')) as {
    Categories: { names: CategoryNames }
  }).Categories.names

/**
 * `server/` cannot import the catalogues, so it carries every category label as a twin.
 * Editing a translation without it would leave Explore matching the old word while the
 * screen shows the new one — nothing else notices.
 */
describe('twins', () => {
  it('seeds exactly the categories the web translates', () => {
    expect(SEEDED_CATEGORY_NAMES).toEqual([...WEB_SEEDED_CATEGORY_NAMES])
  })

  it('holds every locale’s label for each seeded category, and nothing else', () => {
    const catalogues = LOCALES.map(categoryNamesIn)

    for (const name of SEEDED_CATEGORY_NAMES) {
      const key = SEEDED_CATEGORY_MESSAGE_KEYS[name]
      const expected = new Set(catalogues.map((names) => names[key]))
      expect(new Set(SEEDED_CATEGORY_LABELS[name]), name).toEqual(expected)
    }
  })
})

describe('seededCategoriesMatching', () => {
  it('maps a translated word onto the stored English name', () => {
    expect(seededCategoriesMatching('стоматология')).toEqual(['Dentistry'])
    expect(seededCategoriesMatching('Стомат')).toEqual(['Dentistry'])
    expect(seededCategoriesMatching('歯科')).toEqual(['Dentistry'])
    expect(seededCategoriesMatching('ทันตกรรม')).toEqual(['Dentistry'])
    expect(seededCategoriesMatching('Kardiologie')).toEqual(['Cardiology'])
  })

  it('ignores case and accents, as the rest of search does', () => {
    expect(seededCategoriesMatching('PHYSIOTHERAPIE')).toEqual(['Physiotherapy'])
    expect(seededCategoriesMatching('medecine')).toEqual(['General Practice'])
  })

  it('matches the start of a label’s word, which can name several categories', () => {
    expect(seededCategoriesMatching('health')).toEqual(['Mental Health'])
    expect(seededCategoriesMatching('derm')).toEqual(['Dermatology'])
    expect(seededCategoriesMatching('kard')).toEqual(['Cardiology'])
    expect(seededCategoriesMatching('medic')).toEqual(expect.arrayContaining(['General Practice']))
  })

  /**
   * Across sixteen languages a short fragment sits inside some label of most categories —
   * "an" is in Indonesian "Kedokteran gigi" and "Kesehatan mental". Matching inside a word
   * turned every two-letter query into a category hit.
   */
  it('does not match inside a word', () => {
    expect(seededCategoriesMatching('an')).toEqual([])
    expect(seededCategoriesMatching('логия')).toEqual([])
    expect(seededCategoriesMatching('massage')).toEqual([])
    expect(seededCategoriesMatching('   ')).toEqual([])
  })
})

describe('categoryLabels', () => {
  it('lists a seeded category by every label, and a typed one by its own name', () => {
    expect(categoryLabels('Dentistry')).toContain('Стоматология')
    expect(categoryLabels('Massage therapy')).toEqual(['Massage therapy'])
  })

  it('does not read a prototype key as a seeded category', () => {
    expect(categoryLabels('constructor')).toEqual(['constructor'])
  })
})
