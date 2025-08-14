'use client'

import { useCallback, useState } from 'react'
import { CloseCircleFilled, DeleteOutlined, LinkOutlined } from '@ant-design/icons'
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

  const textareaMaxCharsCountRuleSet = useFormItemRules('maxCharsForTextarea')
  const textareaRequiredMaxCharsCountRuleSet = useFormItemRules('required', 'maxCharsForInput')

  const onRemoveUrlClick = useCallback(async () => {
    await formik.setFieldValue('locationURL', '')
    setLocationInputShown(false)
  }, [formik])

  return (
    <Flex vertical gap={0}>
      <ProviderProfileFormItem
        name='address'
        label='Address'
        rules={textareaRequiredMaxCharsCountRuleSet}
        validateTrigger='onChange'
        className={locationInputShown ? 'mb-2!' : undefined}
      >
        <Flex vertical>
          <AppInput
            name='address'
            value={formik.values.address}
            onChange={formik.handleChange}
            disabled={disabled}
            size='large'
          />
          {!locationInputShown && (
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
      </ProviderProfileFormItem>

      {locationInputShown && (
        <ProviderProfileFormItem
          name='locationURL'
          label='Location URL'
          rules={textareaMaxCharsCountRuleSet}
          validateTrigger='onChange'
        >
          <AppInput
            type='url'
            name='url'
            value={formik.values.locationURL}
            onChange={formik.handleChange}
            disabled={disabled}
            size='large'
            suffix={<Button type='text' className='h-[24px]!' icon={<DeleteOutlined />} onClick={onRemoveUrlClick} />}
          />
        </ProviderProfileFormItem>
      )}
    </Flex>
  )
}

export default ProviderProfileLocationInput
