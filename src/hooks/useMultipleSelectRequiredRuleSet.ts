import { useMemo } from 'react'
import { Rule } from 'antd/es/form'

export const useMultipleSelectRequiredRuleSet = (): Rule[] => {
  const rule: Rule[] = useMemo(() => {
    return [
      {
        validator: async (a, b, c) => {
          console.log({ a, b, c })
          return (await smth.length) > 0
        },
      } as Rule,
    ]
  }, [])
  return rule
}
