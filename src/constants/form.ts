import { FormProps } from 'antd'
import { Rule, RuleObject } from 'antd/es/form'

const _RULE_NAMES = {
  required: 'required',
  maxCharsForInput: 'maxCharsForInput',
  maxCharsForTextarea: 'maxCharsForTextarea',
  email: 'email',
} as const

export const FORM_ITEM_RULES: Record<(typeof _RULE_NAMES)[keyof typeof _RULE_NAMES], RuleObject> = {
  required: { required: true, message: 'Please Fill in ${label}' },
  maxCharsForInput: { max: 40, message: 'Max count of characters is 40' },
  maxCharsForTextarea: { max: 300, message: 'Max count of characters is 300' },
  email: { type: 'email', message: 'Invalid Email' },
} as const

export const FORM_ITEM_REQUIRED_RULE_SET: Rule[] = [FORM_ITEM_RULES.required]

export const FORM_DEFAULT_VALIDATION_MESSAGES: FormProps['validateMessages'] = {
  required: "Please input your '${labels}'",
  types: {
    email: "'${value}' is not a valid email!",
    number: "'${name}' is not a valid number!",
  },
}
