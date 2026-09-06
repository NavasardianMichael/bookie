import { theme, type ThemeConfig } from 'antd'
import { BRAND, CSS_VAR_SCOPE, FONT, NEUTRAL, STATUS } from './tokens'

/**
 * Inner padding shared by every form control. Input / InputNumber / DatePicker
 * take these as `paddingBlock` / `paddingInline`. Select and Button do not —
 * see those blocks. Keep the derived values in lockstep so a country-code
 * Select, its neighbour Input, and the submit Button stay the same size.
 */
const FIELD_PADDING_BLOCK = 6
const FIELD_PADDING_INLINE = 12
/** antd seed default. Select's horizontal padding is `paddingSM - lineWidth`. */
const LINE_WIDTH = 1
/** antd `fontHeight` at `FONT.base`: `Math.round(((size + 8) / size) * size)`. */
const FIELD_FONT_HEIGHT = FONT.base + 8
const FIELD_CONTROL_HEIGHT = FIELD_PADDING_BLOCK * 2 + FIELD_FONT_HEIGHT + LINE_WIDTH * 2

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

    borderRadius: 4,

    // NOTE: no `screen*` keys, deliberately. See BREAKPOINTS in ./tokens.ts.
  },

  components: {
    Typography: { margin: 0 },
    // Form items are spaced by the parent form's flex `gap`, which is what the
    // old per-item `mb-0!` was emulating.
    Form: { itemMarginBottom: 0, verticalLabelPadding: '0 0 6px', fontSize: 14 },
    Button: {
      fontWeight: 500,
      borderRadius: 4,
      primaryShadow: 'none',
      defaultShadow: 'none',
      // paddingBlock is @deprecated and unused in antd 6: prepareToken hardcodes
      // buttonPaddingVertical to 0 and sizes the button with controlHeight.
      paddingInline: FIELD_PADDING_INLINE,
    },
    Input: { paddingBlock: FIELD_PADDING_BLOCK, paddingInline: FIELD_PADDING_INLINE },
    InputNumber: { paddingBlock: FIELD_PADDING_BLOCK, paddingInline: FIELD_PADDING_INLINE },
    DatePicker: {
      paddingBlock: FIELD_PADDING_BLOCK,
      paddingInline: FIELD_PADDING_INLINE,
      // TimePicker shares this map. Selected hour/minute cells use
      // `controlItemBgActive` (not optionSelectedBg). Hover is `cellHoverBg`.
      controlItemBgActive: BRAND[900],
      cellHoverBg: BRAND[100],
    },
    Select: {
      optionPadding: `${FIELD_PADDING_BLOCK}px ${FIELD_PADDING_INLINE}px`,
      // No paddingBlock/paddingInline on Select. Horizontal is `paddingSM - lineWidth`;
      // vertical is `(controlHeight - fontHeight) / 2 - lineWidth`. These two values
      // produce 6 / 12 — the same as Input — so Space.Compact groups line up.
      paddingSM: FIELD_PADDING_INLINE + LINE_WIDTH,
      controlHeight: FIELD_CONTROL_HEIGHT,
      optionSelectedBg: BRAND[900],
      optionSelectedColor: NEUTRAL[0],
      optionActiveBg: BRAND[100],
      // Selected+active uses this instead of optionSelectedBg; keep it primary
      // or the highlighted current option paints as a pale hover chip.
      controlItemBgActiveHover: BRAND[900],
    },
  },
}
