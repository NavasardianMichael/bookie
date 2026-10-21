---
name: translations
description: Add or change UI copy in this repo's 16 message catalogues (src/messages/*.json), or add a whole new locale. Covers which namespace a key goes in, the rule that every key exists in all 16 files, Validation.required, writing placeholders and ICU plurals for inflected languages (ru, uk, pl…), and the step-by-step for a new locale including the server-side twins. Use whenever you add a translation key, edit copy, translate a string, or touch src/messages/. Triggers on "add copy", "translate", "new message key", "add a locale", "add a language".
---

# Translations

Routing, locale resolution and SEO live in `src/i18n/CLAUDE.md`. This skill is about the
**words**: the catalogues in `src/messages/<locale>.json`.

```
en · es · pt-BR · fr · it · de · ar · zh-CN · ja · hy · id · ko · uk · pl · th · ru
```

`en.json` is the source of truth and its shape is the TypeScript type of every key.

## Adding or changing a key

1. **Add it to all 16 files in the same change.** A missing key must fail, not fall back
   silently — `tests/unit/i18n/catalogues.spec.ts` fails otherwise. Write a real
   translation in each; do not paste English into the others.
2. **Pick the namespace by surface:** `Language`, `Common`, `Nav`, `Booking`, `Footer`,
   `Contact`, `Settings`, `Bookings`, `Favorites`, `Home`, `Explore`, `Categories`,
   `Organizations`, `Provider`, `Legal`, `Services`, `Validation`, `Errors`, `Admin`,
   `Plans` (plan names and feature labels shared by `/pricing` and the Plan tab),
   `Pricing`, `Billing`, `Auth` (every funnel screen, `Auth.googleErrors.*`).
   - `Bookings` holds only the `/bookings` page's own chrome (title, view switch); its
     panels still read `Settings.bookings` and `Settings.appointments`.
   - Error copy goes in `Errors.kinds.*` (by failure kind), `Errors.codes.*` (by stable
     code) or `Errors.pages.*` — see *Errors* in `src/components/CLAUDE.md`.
3. **Empty-field errors always go through `Validation.required`** ("Please fill in
   {label}") — never a per-field "Please enter …" string. `useFormItemRules` fills
   next-intl's `{label}` with antd's `'${label}'` template, so the field name is translated
   *and* substituted. A field without a `Form.Item label` needs `messageVariables={{ label }}`.
4. Server Components read copy with `getTranslations()` (`next-intl/server`), client
   islands with `useTranslations()`.
5. A seeded category's label changes in `Categories.names`? Update
   `server/src/lib/category-names.ts` too — `categoryNames.spec.ts` fails until you do.

## Writing for inflected languages (ru, uk, pl, …)

**A placeholder cannot be declined.** `{name}`, `{service}`, `{status}` and `{when}` arrive
in the nominative, so a template that puts one after a case-governing preposition
("к {name}", "на {when}") is wrong for most values. `{when}` is the sharpest case: dayjs
`'dddd'` yields the nominative weekday, so "на {when}" reads "на среда". Write around it:

- a colon — `Действия: {name}`
- a generic noun with the value in apposition — `для услуги «{service}»`
- the placeholder as the sentence's subject

**Counts take ICU `plural` with every category the language has** — `one few many other`
for Russian — even where `en.json` interpolates a bare `{count}`. `other` is the fractional
form, not a catch-all. The argument must be a number: a non-numeric value does not throw,
it falls through to `other` and `#` prints `NaN`. So check the call site before turning a
bare `{count}` into a plural.

**Link text next to a sentence fragment** (`TermsNotice`: `{lead} <Terms> {and} <Privacy>.`)
is the nominative page title, so the Russian lead ends in a colon
(`…вы соглашаетесь с документами:`) rather than a verb that would govern another case.

## Adding a locale

1. Add the code to `LOCALES` and a native-language label to `LOCALE_LABELS`
   (`src/i18n/config.ts`) — endonyms only, never translated.
2. Add its antd loader (`antdLocale.ts`) and dayjs import + id (`dayjs.ts`). Check both
   exist in `node_modules` first.
3. If its script is not Latin/Cyrillic/Greek, add a face in `src/styles/fonts.ts` and map it
   in `SCRIPT_FONT_CLASSES` (`preload: false`; write the next/font arguments as literals).
4. Add `src/messages/<locale>.json` with **every** key.
5. If it is RTL, add it to `RTL_LOCALES` in `config.ts` and sweep the layout at `dir="rtl"`.
6. Add it to the three hand-kept twins in `server/`, which cannot import `src/`:
   `LOCALE_SLUGS` (`services/providerSeo.ts`), `VERIFY_LOCALES` (`lib/return-path.ts`) and
   `BOOKING_LOCALES` (`lib/booking-mail.ts`). The first two are pinned by
   `providerSeo.spec.ts` and `returnPath.spec.ts`. **The third is not** — missing it sends
   every booking email for that locale to an English manage page without failing anything.
7. Add its `Categories.names` labels to `SEEDED_CATEGORY_LABELS` in
   `server/src/lib/category-names.ts` (`categoryNames.spec.ts` fails until you do).

A region subtag appears only where it disambiguates a market whose copy differs (`pt-BR`,
`zh-CN`); everything else is a bare language code.

Then run `pnpm verify`.
