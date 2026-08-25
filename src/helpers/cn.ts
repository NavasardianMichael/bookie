import { type ClassValue, clsx } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

/**
 * tailwind-merge only knows Tailwind's built-in scales, and the app's type steps
 * (`text-h1`, `text-body-sm`, …) are custom `--text-*` theme values. Its
 * `text-color` group is a catch-all, so it filed the steps there next to
 * `text-brand-muted` — read the two as conflicting, and dropped one from every
 * size-plus-colour pair. `cn('text-body-sm', 'text-brand-text')` silently returned
 * the colour alone, which is how button labels lost their size.
 *
 * Declaring the steps as font-sizes restores the distinction: an explicit value
 * outranks the catch-all validator, so each resolves to its own group.
 *
 * Keep this list in sync with the `--text-*` block in globals.css §6.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: ['display', 'h1', 'h2', 'h3', 'body', 'body-sm', 'caption', 'overline'] }],
    },
  },
})

/**
 * Merges class names and resolves conflicting Tailwind utilities.
 *
 * Plain concatenation is not enough: class order in the `class` attribute has no
 * effect on precedence — the generated stylesheet's order decides. So a primitive
 * that hardcodes a default (e.g. `bg-transparent`) cannot be overridden by its
 * caller unless the losing class is actually removed, which is what twMerge does.
 */
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs))
