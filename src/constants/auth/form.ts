import { FormProps } from "antd";
import { Rule } from "antd/es/form";

const FORM_ITEM_RULES = {
    required: { required: true },
}

export const FORM_ITEM_REQUIRED_RULE_SET: Rule[] = [
    FORM_ITEM_RULES.required,
]

export const FORM_DEFAULT_VALIDATION_MESSAGES: FormProps['validateMessages'] = {
    required: "Please input your '${name}'",
    types: {
        email: "'${value}' is not a valid email!",
        number: "'${name}' is not a valid number!",
    }
};