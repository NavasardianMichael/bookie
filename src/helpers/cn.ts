import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merges class names and resolves conflicting Tailwind utilities.
 *
 * Plain concatenation is not enough: class order in the `class` attribute has no
 * effect on precedence — the generated stylesheet's order decides. So a primitive
 * that hardcodes a default (e.g. `bg-transparent`) cannot be overridden by its
 * caller unless the losing class is actually removed, which is what twMerge does.
 */
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs))
