#!/usr/bin/env node
/**
 * Design-system and export-style grep gates. Every one must return **0 hits**.
 *
 * These used to live as prose in three places — `src/styles/CLAUDE.md`,
 * `src/components/CLAUDE.md` and `.claude/skills/design-system/SKILL.md` — which meant
 * three copies to keep in step and nothing that ran them. They had already drifted: the
 * skill's antd gate was missing `Statistic.Countdown`. This file is now the single
 * source; those docs point here and describe *why* each gate exists.
 *
 * Scoping by extension is load-bearing. Without it every pattern matches the docs that
 * describe it, and the gate can never pass. That is also why this file lives in
 * `scripts/` — outside every gate's root.
 *
 * **One gate changed meaning on the way in.** The documented `!`-suffix one-liner was
 * `grep -rnoE "[a-z0-9)\]]!'"`. In a POSIX bracket expression a backslash is a literal
 * backslash, not an escape, so that parses as the set {a-z,0-9,')','\'} followed by a
 * *literal* `]` — it only ever matched `]!'`, never `block!'`. It reported 0 while five
 * real suffixes sat in `providerProfileForm/`. The regex below is what the author meant;
 * those five are baselined in `allow`, each naming its docs/BACKLOG.md entry.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const CODE = ['.ts', '.tsx', '.css']
const TS = ['.ts', '.tsx']
const TSX = ['.tsx']

/**
 * `skip` is matched against the repo-relative, forward-slashed path — the equivalent of
 * the `| grep -v` the documented one-liners piped through.
 */
const GATES = [
  {
    name: 'no `dark:` variants',
    why: 'One light theme, permanently — src/styles/CLAUDE.md',
    root: 'src',
    exts: CODE,
    pattern: /dark:/,
  },
  {
    name: 'no `combineClassNames`',
    why: 'Superseded by `cn()` — src/styles/CLAUDE.md',
    root: 'src',
    exts: CODE,
    pattern: /combineClassNames/,
  },
  {
    name: 'no legacy `bookie-*` colours',
    why: 'Colours come from src/styles/tokens.ts',
    root: 'src',
    exts: CODE,
    pattern: /bookie-blue|bookie-gray/,
  },
  {
    name: 'no `!` class suffixes',
    why: "Can't win against antd's unlayered cssinjs — move the value to an antd token",
    root: 'src',
    exts: TSX,
    pattern: /[a-z0-9)\]]!['"`\s]/,
    // Scoped to class-name lines. Unscoped, the pattern also flags English copy that
    // ends in an exclamation mark (`'…successfully created!',`), which is not a
    // Tailwind suffix and never will be.
    requireLine: /className|cn\(/,
    allow: [
      {
        rel: 'src/components/providerProfileForm/ProviderProfileFormGallery.tsx',
        contains: 'mt-4!',
        reason: 'Pre-existing - see docs/BACKLOG.md, "The `!`-suffix gate never ran".',
      },
      {
        rel: 'src/components/providerProfileForm/ProviderProfileFormGallery.tsx',
        contains: 'rounded-tr-lg!',
        reason: 'Pre-existing — see docs/BACKLOG.md, "The `!`-suffix gate never ran".',
      },
      {
        rel: 'src/components/providerProfileForm/ProviderProfileFormGallery.tsx',
        contains: 'rounded-tr-none!',
        reason: 'Pre-existing — see docs/BACKLOG.md, "The `!`-suffix gate never ran".',
      },
      {
        rel: 'src/components/providerProfileForm/ProviderProfileFormImage.tsx',
        contains: 'max-w-80 block!',
        reason: 'Pre-existing — see docs/BACKLOG.md, "The `!`-suffix gate never ran".',
      },
      {
        rel: 'src/components/providerProfileForm/ProviderProfileFormOrganization.tsx',
        contains: 'pl-0!',
        reason: 'Pre-existing — see docs/BACKLOG.md, "The `!`-suffix gate never ran".',
      },
    ],
  },
  {
    name: 'no deleted `2xl:` / `3xl:` breakpoints',
    why: 'Both scales were removed — src/styles/CLAUDE.md',
    root: 'src',
    exts: TSX,
    pattern: /\b(2xl|3xl):[a-z]/,
  },
  {
    name: 'no hardcoded control heights',
    why: 'Use the control-height tokens, not `h-[NNpx]`',
    root: 'src',
    exts: TSX,
    pattern: /h-\[[0-9]+px\]/,
  },
  {
    name: 'no hex outside tokens.ts',
    why: 'A hex belongs in src/styles/tokens.ts and nowhere else',
    root: 'src',
    exts: TS,
    pattern: /#[0-9a-fA-F]{3,8}/,
    /**
     * `src/styles/` is the palette itself.
     *
     * `GoogleButton` is the one deliberate exception: the four hexes in it are **Google's**
     * brand colours, fixed by their sign-in branding guidelines, not ours to choose. Putting
     * them in `tokens.ts` would file a third party's palette alongside our design tokens and
     * invite someone to reuse `#4285F4` as a brand blue. They are inline, in one file, used
     * by one SVG, and must not spread.
     */
    skip: /^src\/styles\/|^src\/app\/\[lang\]\/auth\/components\/GoogleButton\.tsx$/,
  },
  {
    name: 'no legacy Tailwind class aliases',
    why: 'Tailwind still compiles them but they mean something else now — src/styles/CLAUDE.md trap 8',
    root: 'src',
    exts: CODE,
    pattern:
      /(break-words|overflow-ellipsis|order-none|flex-(shrink|grow)-|(bg|text|border|divide|ring|placeholder)-opacity-)/,
  },
  {
    name: 'no bare `<Modal>`',
    why: 'Dialogs go through AppConfirmModal / AppSheet — src/components/CLAUDE.md',
    root: 'src',
    exts: TSX,
    pattern: /<Modal/,
    skip: /^src\/components\/ui\/App/,
  },
  {
    name: 'no deprecated antd props',
    why: 'antd 6 errors on none of these; they break on the next major — src/components/CLAUDE.md',
    root: 'src',
    exts: TS,
    pattern:
      /\b(bordered|showArrow|dropdown(ClassName|Style|Render|MatchSelectWidth)|onDropdownVisibleChange|popupClassName|dataSource|autoClearSearchValue|optionFilterProp|filterSort|filterOption|searchValue|onSearch|bodyStyle|headStyle|onAfterChange|orientationMargin|destroyOnClose|maskClosable|wrapperClassName|addonBefore|addonAfter)=|\b(Select|AutoComplete|TreeSelect|Cascader)\.(Option|OptGroup)\b|\bStatistic\.Countdown\b|antd\/es\/statistic\/Countdown/,
  },
  {
    name: "no raw `next/link`",
    why: 'Produces an unprefixed href — costs a proxy redirect and drops the locale. Use @i18n/navigation',
    root: 'src',
    exts: TS,
    pattern: /from 'next\/link'/,
  },
  {
    name: "no raw `next/navigation`",
    why: 'Use @i18n/navigation for internal destinations — src/i18n/CLAUDE.md',
    root: 'src',
    exts: TS,
    pattern: /from 'next\/navigation'/,
    // `notFound` and `redirect` are fine in a Server Component that is not building an
    // internal href.
    excludeLine: /notFound/,
  },
  {
    name: 'no default exports in components',
    why: 'A default export lets each import site rename the symbol — src/components/CLAUDE.md',
    root: 'src/components',
    exts: TS,
    pattern: /export default/,
  },
  {
    name: 'no `default as` re-exports',
    why: 'Barrels forward the named export — src/components/CLAUDE.md',
    root: 'src/components',
    exts: ['.ts'],
    pattern: /default as/,
  },
]

const walk = (dir, exts, out = []) => {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry)
    if (statSync(full).isDirectory()) walk(full, exts, out)
    else if (exts.includes(path.extname(entry))) out.push(full)
  }
  return out
}

const hitsFor = ({ root, exts, pattern, skip, requireLine, excludeLine, allow }) =>
  walk(path.join(ROOT, root), exts)
    .map((file) => ({ file, rel: path.relative(ROOT, file).split(path.sep).join('/') }))
    .filter(({ rel }) => !skip?.test(rel))
    .flatMap(({ file, rel }) =>
      readFileSync(file, 'utf8')
        .split(/\r?\n/)
        .map((line, i) => ({ rel, line: i + 1, text: line.trim() }))
        .filter(({ text }) => pattern.test(text))
        .filter(({ text }) => !requireLine || requireLine.test(text))
        .filter(({ text }) => !excludeLine?.test(text))
        .filter(({ rel: r, text }) => !allow?.some((a) => a.rel === r && text.includes(a.contains)))
    )

let failed = 0

for (const gate of GATES) {
  const hits = hitsFor(gate)
  if (!hits.length) {
    console.log(`  ok   ${gate.name}`)
    continue
  }
  failed += 1
  console.log(`  FAIL ${gate.name} — ${hits.length} hit${hits.length > 1 ? 's' : ''}`)
  console.log(`       ${gate.why}`)
  for (const hit of hits.slice(0, 10)) console.log(`       ${hit.rel}:${hit.line}  ${hit.text.slice(0, 100)}`)
  if (hits.length > 10) console.log(`       … and ${hits.length - 10} more`)
}

console.log(
  failed
    ? `\n${failed} of ${GATES.length} gates failed.`
    : `\n${GATES.length} gates clean.`
)
process.exit(failed ? 1 : 0)
