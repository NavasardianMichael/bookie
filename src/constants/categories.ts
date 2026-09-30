/**
 * English names of the seeded Category rows (`server/prisma/seed.ts`).
 *
 * The database stores these strings as the stable identity (`Category.name` is unique).
 * UI copy is looked up by this English key in `Categories.names.*` — see
 * `helpers/categoryName.ts`. User-created categories keep whatever name was typed and
 * are shown as-is.
 */
export const SEEDED_CATEGORY_NAMES = [
  'General Practice',
  'Dentistry',
  'Physiotherapy',
  'Dermatology',
  'Cardiology',
  'Mental Health',
] as const

export type SeededCategoryName = (typeof SEEDED_CATEGORY_NAMES)[number]

/** Message-catalogue key under `Categories.names` for each seeded English name. */
export const SEEDED_CATEGORY_MESSAGE_KEYS = {
  'General Practice': 'generalPractice',
  Dentistry: 'dentistry',
  Physiotherapy: 'physiotherapy',
  Dermatology: 'dermatology',
  Cardiology: 'cardiology',
  'Mental Health': 'mentalHealth',
} as const satisfies Record<SeededCategoryName, string>

export type SeededCategoryMessageKey =
  (typeof SEEDED_CATEGORY_MESSAGE_KEYS)[SeededCategoryName]
