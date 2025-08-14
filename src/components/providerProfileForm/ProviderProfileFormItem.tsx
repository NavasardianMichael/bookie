import { useMemo } from 'react'
import { Form, FormItemProps } from 'antd'
import { PROVIDER_PROFILE_FORM_INITIAL_VALUES } from '@constants/providers'

import '@ant-design/v5-patch-for-react-19'

type Props = FormItemProps

const ProviderProfileFormItem: React.FC<Props> = ({ children, label, ...props }) => {
  const memoizedMessageVariables: FormItemProps['messageVariables'] = useMemo(() => {
    return { label } as Record<string, string>
  }, [label])

  return (
    <Form.Item<typeof PROVIDER_PROFILE_FORM_INITIAL_VALUES>
      messageVariables={memoizedMessageVariables}
      validateDebounce={300}
      label={label}
      hasFeedback
      // validateTrigger='onChange'
      {...props}
    >
      {children}
    </Form.Item>
  )
}

export default ProviderProfileFormItem
