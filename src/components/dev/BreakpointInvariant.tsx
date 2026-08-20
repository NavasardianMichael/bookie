'use client'

import { useEffect } from 'react'
import { theme } from 'antd'
import { BREAKPOINTS } from '@styles/tokens'

/**
 * Development-only guard for the one accepted duplication in the design system.
 *
 * Breakpoints cannot be derived in either direction — antd's `screen*` tokens
 * must be JS numbers (they feed `matchMedia`) and Tailwind's `--breakpoint-*`
 * must be CSS literals (media queries cannot resolve `var()`). This asserts that
 * tokens.ts, globals.css and antd all agree. Renders nothing.
 */
export const BreakpointInvariant = () => {
  const { token } = theme.useToken()

  useEffect(() => {
    const root = getComputedStyle(document.documentElement)

    Object.entries(BREAKPOINTS).forEach(([name, expected]) => {
      const fromCss = parseFloat(root.getPropertyValue(`--breakpoint-${name}`))
      const fromAntd = token[`screen${name.toUpperCase()}` as 'screenMD'] as number

      // Tailwind tree-shakes unused @theme vars, so NaN means "no utility uses
      // this breakpoint yet", not a mismatch.
      if (!Number.isNaN(fromCss) && fromCss !== expected) {
        console.error(
          `[breakpoints] "${name}" disagrees — tokens.ts=${expected}, --breakpoint-${name}=${fromCss}`
        )
      }

      if (fromAntd !== expected) {
        console.error(
          `[breakpoints] "${name}" disagrees — tokens.ts=${expected}, antd screen${name.toUpperCase()}=${fromAntd}`
        )
      }
    })
  }, [token])

  return null
}
