'use client'

import { useCallback, useState } from 'react'
import { LinkOutlined, MinusCircleOutlined } from '@ant-design/icons'
import { Button, Flex } from 'antd'
import { FormikProps } from 'formik'
import { useFormItemRules } from '@hooks/useFormItemRules'
import { ProviderProfileFormValues } from '@interfaces/providers'
import AppProfileFormItem from '@components/ui/AppFormItem'
import AppInput from '@components/ui/AppInput'

type Props = {
  disabled: boolean
  formik: FormikProps<ProviderProfileFormValues>
}

const ProviderProfileLocationInput: React.FC<Props> = ({ formik, disabled }) => {
  const [locationInputShown, setLocationInputShown] = useState(!!formik.values.locationURL)

  const textareaRequiredMaxCharsCountRuleSet = useFormItemRules('required', 'maxCharsForInput')
  const urlRuleSet = useFormItemRules('required', 'url')

  const onRemoveUrlClick = useCallback(async () => {
    await formik.setFieldValue('locationURL', undefined)
    setLocationInputShown(false)
  }, [formik])

  return (
    <Flex vertical gap={locationInputShown ? 16 : 0}>
      <AppProfileFormItem name='address' label='Address' rules={textareaRequiredMaxCharsCountRuleSet}>
        <Flex vertical>
          <AppInput
            name='address'
            value={formik.values.address}
            onChange={formik.handleChange}
            disabled={disabled}
            size='large'
          />
        </Flex>
      </AppProfileFormItem>

      {locationInputShown ? (
        <AppProfileFormItem name='locationURL' label='Location URL' rules={urlRuleSet}>
          <Flex gap={8} align='center'>
            <AppInput
              type='url'
              name='locationURL'
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
        </AppProfileFormItem>
      ) : (
        <Button
          type='text'
          icon={<LinkOutlined />}
          className='w-fit! pl-0!'
          onClick={() => setLocationInputShown(true)}
          disabled={formik.isSubmitting}
        >
          Attach URL
        </Button>
      )}
    </Flex>
  )
}

export default ProviderProfileLocationInput
