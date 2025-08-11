import { useMemo } from 'react'
import { FORM_ITEM_RULES } from '@constants/form'

export const useFormItemRules = (...ruleNames: (keyof typeof FORM_ITEM_RULES)[]) => {
  const rules = useMemo(() => {
    // eslint-disable-next-line security/detect-object-injection
    return ruleNames.map((ruleName) => FORM_ITEM_RULES[ruleName])
    // No Need to add rule names to deps array, as they are not going to change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return rules
}
