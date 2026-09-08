import { FormProps } from 'antd'
import type { Rule, RuleObject } from 'antd/es/form'

export const MAX_CHARS_FOR_INPUT = 40
export const MAX_CHARS_FOR_TEXTAREA = 300

/**
 * The contact page's message box, deliberately larger than `MAX_CHARS_FOR_TEXTAREA` —
 * that figure sizes a profile blurb, while a support request needs room to describe what
 * went wrong.
 *
 * `useFormItemRules` composes named rules only and cannot parameterise `max`, so the
 * contact form writes its rule inline. Keep this in step with `MAX_MESSAGE_LENGTH` in
 * `server/src/routes/contact.ts`, which truncates at the same figure.
 */
export const MAX_CHARS_FOR_CONTACT_MESSAGE = 2000

const _RULE_NAMES = {
  required: 'required',
  maxCharsForInput: 'maxCharsForInput',
  maxCharsForTextarea: 'maxCharsForTextarea',
  email: 'email',
  oneItemSelectedAtLeast: 'oneItemSelectedAtLeast',
  url: 'url',
  positiveNumber: 'positiveNumber',
} as const

export const FORM_ITEM_RULES: Record<(typeof _RULE_NAMES)[keyof typeof _RULE_NAMES], RuleObject> = {
  required: { required: true, message: 'Please fill in ${label}' },
  maxCharsForInput: { max: MAX_CHARS_FOR_INPUT, message: `Max count of characters is ${MAX_CHARS_FOR_INPUT}` },
  maxCharsForTextarea: {
    max: MAX_CHARS_FOR_TEXTAREA,
    message: `Max count of characters is ${MAX_CHARS_FOR_TEXTAREA}`,
  },
  oneItemSelectedAtLeast: { type: 'array', min: 1, message: 'Please select at least one item' },
  email: { type: 'email', message: 'Invalid Email' },
  positiveNumber: { type: 'number', min: 0, message: 'Must be a positive number' },
  url: { type: 'url', message: 'Invalid URL' },
} as const

export const FORM_ITEM_REQUIRED_RULE_SET: Rule[] = [FORM_ITEM_RULES.required]

export const FORM_DEFAULT_VALIDATION_MESSAGES: FormProps['validateMessages'] = {
  required: "Please input your '${labels}'",
  types: {
    email: "'${value}' is not a valid email!",
    number: "'${name}' is not a valid number!",
  },
}
