import { theme, type ThemeConfig } from 'antd'
import { BRAND, CONTROL, FONT, NEUTRAL, RADII, STATUS } from './tokens'

export const antdTheme: ThemeConfig = {
  /**
   * CSS-variable mode. This is what lets plain CSS files (the FullCalendar
   * override) and Tailwind's `@theme` reference the palette instead of
   * re-declaring hex. antd owns the values; everyone else derives them.
   */
  cssVar: { prefix: 'ant' },
  algorithm: theme.defaultAlgorithm,

  token: {
    fontFamily: 'var(--font-app), system-ui, -apple-system, sans-serif',

    // Seed colors must be literals: antd feeds colorPrimary to its palette
    // generator to derive Hover/Active/Bg variants, and a `var()` string
    // produces garbage swatches.
    colorPrimary: BRAND[900],
    colorLink: BRAND[700],
    colorTextBase: BRAND[900],

    // colorTextSecondary was previously the same navy as colorTextBase, which
    // made every `Typography type='secondary'` render with zero de-emphasis.
    colorTextSecondary: NEUTRAL[600],
    colorTextTertiary: NEUTRAL[500],
    colorTextDescription: NEUTRAL[600],

    colorBorder: NEUTRAL[200],
    colorBorderSecondary: NEUTRAL[100],
    colorBgLayout: NEUTRAL[50],
    colorBgContainer: NEUTRAL[0],

    colorSuccess: STATUS.success,
    colorWarning: STATUS.warning,
    colorError: STATUS.danger,
    colorInfo: STATUS.info,

    borderRadius: RADII.base,
    borderRadiusLG: RADII.lg,

    // Single source for control sizing: `size='large'` now resolves to 48px,
    // which clears the 44px touch-target minimum and retires every `h-[56px]!`.
    controlHeight: CONTROL.height,
    controlHeightLG: CONTROL.heightLG,
    controlHeightSM: CONTROL.heightSM,

    fontSize: FONT.base,

    // NOTE: no `screen*` keys, deliberately. See BREAKPOINTS in ./tokens.ts.
  },

  components: {
    Typography: { margin: 0 },
    // Form items are spaced by the parent form's flex `gap`, which is what the
    // old per-item `mb-0!` was emulating.
    Form: { itemMarginBottom: 0, verticalLabelPadding: '0 0 6px' },
    Button: { fontWeight: 600, primaryShadow: 'none', defaultShadow: 'none' },
  },
}
