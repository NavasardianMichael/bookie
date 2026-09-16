'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { FORM_ITEM_RULES } from '@constants/form'

/**
 * Named antd rules with catalogue copy. `FORM_ITEM_RULES` holds the constraint;
 * `Validation.*` holds the message so a failed field is not half-English.
 *
 * `Validation.required` uses next-intl's `{label}`. Passing the literal
 * `'${label}'` as that value leaves antd's template intact for
 * `messageVariables` — a raw `${label}` in the catalogue would be eaten as ICU.
 */
export const useFormItemRules = (...ruleNames: (keyof typeof FORM_ITEM_RULES)[]) => {
  const t = useTranslations('Validation')

  return useMemo(
    () =>
      ruleNames.map((ruleName) => {
        const rule = FORM_ITEM_RULES[ruleName]
        const max = 'max' in rule ? rule.max : undefined
        return {
          ...rule,
          // Single-quoted so this stays the antd template, not a JS interpolation.
          message: max !== undefined ? t(ruleName, { max }) : t(ruleName, { label: '${label}' }),
        }
      }),
    // ruleNames are call-site literals and will not change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t]
  )
}
