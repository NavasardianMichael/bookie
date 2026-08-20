/**
 * The single source of truth for design constants.
 *
 * A raw hex or a magic control dimension may appear in THIS FILE ONLY. Everything
 * else derives from here:
 *
 *   tokens.ts -> theme.ts -> ConfigProvider (cssVar) -> :root{--ant-*}
 *             -> globals.css alias block -> @theme inline -> Tailwind utilities
 */

/** Brand ramp derived from #18294d (H 220, S 53%), lightness stepped, saturation eased at the light end. */
export const BRAND = {
  50: '#f2f5fa',
  100: '#e3e9f4',
  200: '#c6d1e6',
  300: '#9dafd2',
  400: '#6d84b4',
  500: '#4a6194',
  600: '#33487a',
  700: '#243662',
  800: '#1c2b50',
  900: '#18294d',
  950: '#0e1830',
} as const

export const NEUTRAL = {
  0: '#ffffff',
  50: '#f8f9fb',
  100: '#f1f3f7',
  200: '#e4e8ef',
  300: '#cfd5e0',
  400: '#a3abbd',
  500: '#767f94',
  600: '#5a6480',
  700: '#414a63',
  800: '#2b3245',
  900: '#1b2030',
} as const

export const STATUS = {
  success: '#0e9f6e',
  warning: '#c2870b',
  danger: '#dc2626',
  info: '#2563eb',
} as const

export const RADII = { base: 8, lg: 12 } as const

/** Drives every control height in the app, replacing the per-call-site `h-[56px]!`. */
export const CONTROL = { height: 40, heightLG: 48, heightSM: 32 } as const

export const FONT = { base: 16 } as const

/**
 * antd v6's built-in screen scale (see node_modules/antd/es/theme/util/alias.js),
 * restated for the rare JS consumer that cannot use `Grid.useBreakpoint()`.
 *
 * DO NOT pass these into ConfigProvider. They are already antd's defaults, and
 * overriding a single `screen*` token forces you to override all 21 of them —
 * `validateBreakpoints()` throws at runtime if the Min/Max chain is inconsistent.
 *
 * These values are mirrored as `--breakpoint-*` literals in globals.css. That
 * mirror is the one accepted duplication in the design system, and it is
 * unavoidable: media queries cannot resolve `var()`, and antd's screen tokens sit
 * in cssinjs' `preserve` list so they are never emitted as CSS variables.
 * `<BreakpointInvariant/>` asserts the two agree in development.
 */
export const BREAKPOINTS = {
  xs: 480,
  sm: 576,
  md: 768,
  lg: 992,
  xl: 1200,
  xxl: 1600,
  xxxl: 1920,
} as const

export type BreakpointName = keyof typeof BREAKPOINTS
