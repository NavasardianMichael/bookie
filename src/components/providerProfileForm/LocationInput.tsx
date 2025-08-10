'use client'

import { useCallback, useState } from 'react'
import { CloseCircleFilled, LinkOutlined } from '@ant-design/icons'
import { Button, Flex, Form } from 'antd'
import { FormikProps } from 'formik'
import { ProviderProfileFormValues } from '@interfaces/providers'
import { FORM_ITEM_REQUIRED_RULE_SET } from '@constants/form'
import { PROVIDER_PROFILE_FORM_INITIAL_VALUES } from '@constants/providers'
import AppInput from '@components/ui/AppInput'

type Props = {
  disabled: boolean
  formik: FormikProps<ProviderProfileFormValues>
}

const LocationInput: React.FC<Props> = ({ formik, disabled }) => {
  const [locationInputShown, setLocationInputShown] = useState(!!formik.values.locationURL)

  const onRemoveUrlClick = useCallback(async () => {
    await formik.setFieldValue('location.url', '')
    setLocationInputShown(false)
  }, [formik])

  return (
    <Flex vertical gap={0}>
      <Form.Item<typeof PROVIDER_PROFILE_FORM_INITIAL_VALUES>
        name='address'
        label='Address'
        messageVariables={{ label: 'Address' }}
        rules={FORM_ITEM_REQUIRED_RULE_SET}
        validateTrigger={['onChange']}
      >
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
      </Form.Item>

      {locationInputShown && (
        <Form.Item<typeof PROVIDER_PROFILE_FORM_INITIAL_VALUES>
          name='locationURL'
          label='Location URL'
          messageVariables={{ label: 'Location URL' }}
          rules={[
            {
              pattern: new RegExp(
                '/^https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)$/'
              ),
            },
          ]}
          validateTrigger={['onChange']}
        >
          <AppInput
            type='url'
            name='url'
            value={formik.values.locationURL}
            onChange={formik.handleChange}
            disabled={disabled}
            size='large'
            suffix={
              <Button type='text' className='h-[24px]!' icon={<CloseCircleFilled />} onClick={onRemoveUrlClick} />
            }
          />
        </Form.Item>
      )}
    </Flex>
  )
}

export default LocationInput
