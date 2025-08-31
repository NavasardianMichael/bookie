import { useMemo } from 'react'
import { Form, FormItemProps } from 'antd'

type Props = FormItemProps

const AppProfileFormItem: React.FC<Props> = ({ children, label, className, ...props }) => {
  const memoizedMessageVariables: FormItemProps['messageVariables'] = useMemo(() => {
    return { label } as Record<string, string>
  }, [label])

  return (
    <Form.Item
      messageVariables={memoizedMessageVariables}
      validateDebounce={300}
      label={label}
      validateTrigger='onChange'
      hasFeedback
      className={`mb-0! ${className}`}
      {...props}
    >
      {children}
    </Form.Item>
  )
}

export default AppProfileFormItem
