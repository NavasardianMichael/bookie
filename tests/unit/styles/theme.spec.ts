import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { antdTheme } from '@styles/theme'
import { BRAND, CSS_VAR_SCOPE, NEUTRAL } from '@styles/tokens'

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
  it('uses a 4px control radius', () => {
    expect(antdTheme.token).toMatchObject({
      borderRadius: 4,
    })
  })

  // Control height is deliberately antd's own default — see src/styles/CLAUDE.md.
  it('leaves control height alone', () => {
    expect(antdTheme.token).not.toHaveProperty('controlHeight')
    expect(antdTheme.token).not.toHaveProperty('controlHeightLG')
  })
})

describe('form control padding', () => {
  const padding = { paddingBlock: 6, paddingInline: 12 }

  it('gives Input, InputNumber and DatePicker the same inner padding', () => {
    expect(antdTheme.components?.Input).toMatchObject(padding)
    expect(antdTheme.components?.InputNumber).toMatchObject(padding)
    expect(antdTheme.components?.DatePicker).toMatchObject(padding)
  })

  it('paints DatePicker/TimePicker selected cells like Select options', () => {
    expect(antdTheme.components?.DatePicker).toMatchObject({
      controlItemBgActive: BRAND[900],
      cellHoverBg: BRAND[100],
    })
  })

  it('sizes Select so its derived selector padding matches that inner padding', () => {
    // Select has no paddingBlock/paddingInline. Horizontal is paddingSM - lineWidth;
    // vertical is (controlHeight - fontHeight) / 2 - lineWidth. fontHeight is 22 at
    // seed fontSize 14. These two values produce 6 / 12 — the same as Input.
    expect(antdTheme.components?.Select).toMatchObject({
      paddingSM: 13,
      controlHeight: 36,
      optionPadding: '6px 12px',
      optionSelectedBg: BRAND[900],
      optionSelectedColor: NEUTRAL[0],
      controlItemBgActiveHover: BRAND[900],
    })
  })

  it('sizes Button with controlHeight, not paddingBlock', () => {
    // antd 6 hardcodes buttonPaddingVertical to 0. Horizontal padding is the
    // only padding token that lands; height is controlHeight.
    expect(antdTheme.components?.Button).toMatchObject({
      paddingInline: 12,
    })
    expect(antdTheme.components?.Button).not.toHaveProperty('paddingBlock')
  })
})
