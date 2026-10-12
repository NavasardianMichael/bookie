import { normalizeSearchText } from './search.js'

/**
 * The seeded categories' names in every language the web app speaks, so Explore finds
 * "Стоматология" as readily as "Dentistry".
 *
 * `Category.name` stores the English string as the row's identity, and the web translates
 * it for display only (`src/helpers/categoryName.ts`, `Categories.names.*`). Search runs
 * here, against the stored text — so without these, a visitor who types the label they can
 * see on screen finds nothing.
 *
 * **Twin of `Categories.names` in `src/messages/*.json`.** The server cannot import the
 * web's catalogues, and they would not ship in the API release if it did;
 * `tests/unit/server/categoryNames.spec.ts` rebuilds this table from them and fails on any
 * difference. Every language matches whatever the page's locale: the language a visitor
 * types in need not be the one they browse in.
 */
export const SEEDED_CATEGORY_LABELS = {
  'General Practice': [
    'General Practice',
    'Medicina general',
    'Clínica geral',
    'Médecine générale',
    'Medicina generale',
    'Allgemeinmedizin',
    'الطب العام',
    '全科医疗',
    '一般診療',
    'Ընդհանուր բժշկություն',
    'Praktik umum',
    '가정의학',
    'Загальна практика',
    'Medycyna ogólna',
    'แพทย์ทั่วไป',
    'Общая практика',
  ],
  Dentistry: [
    'Dentistry',
    'Odontología',
    'Odontologia',
    'Dentisterie',
    'Odontoiatria',
    'Zahnmedizin',
    'طب الأسنان',
    '牙科',
    '歯科',
    'Ստոմատոլոգիա',
    'Kedokteran gigi',
    '치과',
    'Стоматологія',
    'Stomatologia',
    'ทันตกรรม',
    'Стоматология',
  ],
  Physiotherapy: [
    'Physiotherapy',
    'Fisioterapia',
    'Physiothérapie',
    'Physiotherapie',
    'العلاج الطبيعي',
    '物理治疗',
    '理学療法',
    'Ֆիզիոթերապիա',
    'Fisioterapi',
    '물리치료',
    'Фізіотерапія',
    'Fizjoterapia',
    'กายภาพบำบัด',
    'Физиотерапия',
  ],
  Dermatology: [
    'Dermatology',
    'Dermatología',
    'Dermatologia',
    'Dermatologie',
    'الأمراض الجلدية',
    '皮肤科',
    '皮膚科',
    'Մաշկաբանություն',
    'Dermatologi',
    '피부과',
    'Дерматологія',
    'โรคผิวหนัง',
    'Дерматология',
  ],
  Cardiology: [
    'Cardiology',
    'Cardiología',
    'Cardiologia',
    'Cardiologie',
    'Kardiologie',
    'أمراض القلب',
    '心内科',
    '循環器内科',
    'Սրտաբանություն',
    'Kardiologi',
    '심장내과',
    'Кардіологія',
    'Kardiologia',
    'อายุรกรรมหัวใจ',
    'Кардиология',
  ],
  'Mental Health': [
    'Mental Health',
    'Salud mental',
    'Saúde mental',
    'Santé mentale',
    'Salute mentale',
    'Psychische Gesundheit',
    'الصحة النفسية',
    '心理健康',
    'メンタルヘルス',
    'Հոգեկան առողջություն',
    'Kesehatan mental',
    '정신 건강',
    "Психічне здоров'я",
    'Zdrowie psychiczne',
    'สุขภาพจิต',
    'Психическое здоровье',
  ],
} as const satisfies Record<string, readonly string[]>

export type SeededCategoryName = keyof typeof SEEDED_CATEGORY_LABELS

/** The rows `prisma/seed.ts` upserts, in its order — which its `categoryIdx` fields index. */
export const SEEDED_CATEGORY_NAMES = Object.keys(SEEDED_CATEGORY_LABELS) as SeededCategoryName[]

/** Normalized once, with a leading space so a word start is ` ${needle}`. */
const NORMALIZED_LABELS = SEEDED_CATEGORY_NAMES.map((name) => ({
  name,
  labels: SEEDED_CATEGORY_LABELS[name].map((label) => ` ${normalizeSearchText(label)}`),
}))

/**
 * The English names of the seeded categories with a label, in any language, that has a
 * word starting with `term` — the stored names a translated query word stands for.
 * Normalized on both sides, so case, accents and punctuation do not decide it.
 *
 * A word start, not anywhere inside: across sixteen languages a two-letter fragment is
 * inside some label of nearly every category ("an" is in Indonesian "Kedokteran gigi" and
 * "Kesehatan mental"), which would turn every short query into a category match. People
 * type the start of the word they mean — "стомат" still finds Dentistry.
 */
export const seededCategoriesMatching = (term: string): SeededCategoryName[] => {
  const needle = normalizeSearchText(term)
  if (!needle) return []
  return NORMALIZED_LABELS.filter(({ labels }) => labels.some((label) => label.includes(` ${needle}`))).map(
    ({ name }) => name
  )
}

/**
 * Every name a category goes by: its labels when seeded, else the name it was created with.
 * `hasOwn`, not `in` — a category someone named "constructor" is free text, not a prototype key.
 */
export const categoryLabels = (name: string): readonly string[] =>
  Object.hasOwn(SEEDED_CATEGORY_LABELS, name) ? SEEDED_CATEGORY_LABELS[name as SeededCategoryName] : [name]
