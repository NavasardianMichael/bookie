import { theme, type ThemeConfig } from 'antd'
import { BRAND, CSS_VAR_SCOPE, FONT, NEUTRAL, RADII, STATUS } from './tokens'

export const antdTheme: ThemeConfig = {
  /**
   * CSS-variable mode. This is what lets plain CSS files (the FullCalendar
   * override) and Tailwind's `@theme` reference the palette instead of
   * re-declaring hex. antd owns the values; everyone else derives them.
   *
   * `key` is the class the emitted `--ant-*` block is scoped to. Without it antd
   * derives one from `useId()`, so the only element carrying it is each antd
   * component itself — nothing else in the tree can read the variables, and the
   * whole globals.css alias chain resolves to nothing. `CSS_VAR_SCOPE` is put on
   * `<html>` in `src/app/layout.tsx` so the block lands on `:root`.
   */
  cssVar: { prefix: 'ant', key: CSS_VAR_SCOPE },
  algorithm: theme.defaultAlgorithm,

  token: {
    // --font-stack appends the per-locale script face after Manrope; globals.css §4 owns it.
    fontFamily: 'var(--font-stack)',

    // Seed colors must be literals: antd feeds colorPrimary to its palette
    // generator to derive Hover/Active/Bg variants, and a `var()` string
    // produces garbage swatches.
    colorPrimary: BRAND[900],
    colorLink: BRAND[700],
    // Charcoal body copy, not navy — navy is the brand accent, not the text.
    colorTextBase: NEUTRAL[900],

    colorTextSecondary: NEUTRAL[500],
    colorTextTertiary: NEUTRAL[500],
    colorTextDescription: NEUTRAL[500],

    colorBorder: NEUTRAL[200],
    colorBorderSecondary: NEUTRAL[100],
    colorBgLayout: NEUTRAL[50],
    colorBgContainer: NEUTRAL[0],

    colorSuccess: STATUS.success,
    colorWarning: STATUS.warning,
    colorError: STATUS.danger,
    colorInfo: STATUS.info,

    fontSize: FONT.base,
    borderRadius: RADII.base,
    borderRadiusLG: RADII.lg,

    // NOTE: no `screen*` keys, deliberately. See BREAKPOINTS in ./tokens.ts.
  },

  components: {
    Typography: { margin: 0 },
    // Form items are spaced by the parent form's flex `gap`, which is what the
    // old per-item `mb-0!` was emulating.
    Form: { itemMarginBottom: 0, verticalLabelPadding: '0 0 6px', fontSize: 14 },
    Button: {
      fontWeight: 600,
      primaryShadow: 'none',
      defaultShadow: 'none',
      paddingInline: 12,
      paddingBlock: 6,
    },
    Input: { paddingBlock: 6, paddingInline: 12 },
    Select: {
      optionPadding: '6px 12px',
      optionSelectedBg: BRAND[500],
      optionActiveBg: BRAND[100],
      optionSelectedColor: '#fff',
    },
    DatePicker: { paddingBlock: 6, paddingInline: 12 },
  },
}
