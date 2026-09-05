import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { antdTheme } from '@styles/theme'
import { CSS_VAR_SCOPE, RADII } from '@styles/tokens'

const layoutSource = readFileSync(join(process.cwd(), 'src/app/[lang]/layout.tsx'), 'utf8')

/**
 * antd scopes its emitted `--ant-*` block to `theme.cssVar.key`. If that key is not
 * also on `<html>`, the block lands on a selector nothing matches: antd's own
 * components still style themselves, but every `bg-brand` / `rounded-brand` /
 * `border-brand-border` in the app resolves to nothing — transparent brand fills,
 * 0 radius, default borders. That shipped once, silently, because nothing failed:
 * typecheck, lint and the suite all passed against a page painted wrong.
 */
describe('antd cssVar scope', () => {
  it('pins the emitted variable block to a class we control', () => {
    expect(antdTheme.cssVar).toMatchObject({ key: CSS_VAR_SCOPE })
  })

  it('stamps that same class on <html>, so the block lands on :root', () => {
    // `<html lang=`, not `<html`: the comment above the tag mentions `<html>` too.
    const htmlTag = layoutSource.match(/<html\s+lang=[^>]*>/)?.[0] ?? ''

    expect(htmlTag).toContain('CSS_VAR_SCOPE')
    expect(layoutSource).toContain("from '@styles/tokens'")
  })
})

describe('radius tokens', () => {
  it('feeds RADII into the antd tokens the Tailwind aliases derive from', () => {
    expect(antdTheme.token).toMatchObject({
      borderRadius: RADII.base,
      borderRadiusLG: RADII.lg,
    })
  })

  // Control height is deliberately antd's own default — see src/styles/CLAUDE.md.
  it('leaves control height alone', () => {
    expect(antdTheme.token).not.toHaveProperty('controlHeight')
    expect(antdTheme.token).not.toHaveProperty('controlHeightLG')
  })
})
