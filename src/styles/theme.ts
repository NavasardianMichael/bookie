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
    fontFamily: 'var(--font-app), system-ui, -apple-system, sans-serif',

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

    // Control height stays antd's own default. Radius does not: see RADII.
    borderRadius: RADII.base,
    borderRadiusLG: RADII.lg,

    fontSize: FONT.base,

    // NOTE: no `screen*` keys, deliberately. See BREAKPOINTS in ./tokens.ts.
  },

  components: {
    Typography: { margin: 0 },
    // Form items are spaced by the parent form's flex `gap`, which is what the
    // old per-item `mb-0!` was emulating.
    Form: { itemMarginBottom: 0, verticalLabelPadding: '0 0 6px' },
    Button: { fontWeight: 700, primaryShadow: 'none', defaultShadow: 'none' },
  },
}
