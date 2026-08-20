import { useMemo } from 'react'
import { Form, FormItemProps } from 'antd'
import { cn } from '@helpers/cn'

type Props = FormItemProps

const AppFormItem: React.FC<Props> = ({ children, label, className, ...props }) => {
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
      className={cn(className)}
      {...props}
    >
      {children}
    </Form.Item>
  )
}

export default AppFormItem
