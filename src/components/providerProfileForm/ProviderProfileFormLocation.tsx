'use client'

import { useCallback, useState } from 'react'
import { LinkOutlined, MinusCircleOutlined } from '@ant-design/icons'
import { Button, Flex } from 'antd'
import { FormikProps } from 'formik'
import { useFormItemRules } from '@hooks/useFormItemRules'
import { ProviderProfileFormValues } from '@interfaces/providers'
import AppInput from '@components/ui/AppInput'
import ProviderProfileFormItem from './ProviderProfileFormItem'

type Props = {
  disabled: boolean
  formik: FormikProps<ProviderProfileFormValues>
}

const ProviderProfileLocationInput: React.FC<Props> = ({ formik, disabled }) => {
  const [locationInputShown, setLocationInputShown] = useState(!!formik.values.locationURL)

  const textareaMaxCharsCountRuleSet = useFormItemRules('required', 'maxCharsForTextarea')
  const textareaRequiredMaxCharsCountRuleSet = useFormItemRules('required', 'maxCharsForInput')

  const onRemoveUrlClick = useCallback(async () => {
    await formik.setFieldValue('locationURL', undefined)
    setLocationInputShown(false)
  }, [formik])

  return (
    <Flex vertical gap={0} className='mb-4!'>
      <ProviderProfileFormItem
        name='address'
        label='Address'
        rules={textareaRequiredMaxCharsCountRuleSet}
        className={locationInputShown ? undefined : 'mb-0!'}
      >
        <Flex vertical>
          <AppInput
            name='address'
            value={formik.values.address}
            onChange={formik.handleChange}
            disabled={disabled}
            size='large'
          />
        </Flex>
      </ProviderProfileFormItem>

      {locationInputShown ? (
        <ProviderProfileFormItem name='locationURL' label='Location URL' rules={textareaMaxCharsCountRuleSet}>
          <Flex gap={8} align='center'>
            <AppInput
              type='url'
              name='url'
              value={formik.values.locationURL}
              onChange={formik.handleChange}
              disabled={disabled}
              size='large'
            />
            <Button
              type='text'
              size='large'
              icon={<MinusCircleOutlined className='text-red-600!' />}
              onClick={onRemoveUrlClick}
            />
          </Flex>
        </ProviderProfileFormItem>
      ) : (
        <Button
          type='text'
          icon={<LinkOutlined />}
          className='w-fit! pl-0!'
          onClick={() => setLocationInputShown(true)}
        >
          Attach URL
        </Button>
      )}
    </Flex>
  )
}

export default ProviderProfileLocationInput
