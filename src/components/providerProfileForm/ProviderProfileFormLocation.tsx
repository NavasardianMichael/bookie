'use client'

import { useCallback, useState } from 'react'
import { LinkOutlined, MinusCircleOutlined } from '@ant-design/icons'
import { Button, Flex, Form } from 'antd'
import { useTranslations } from 'next-intl'
import { useFormItemRules } from '@hooks/useFormItemRules'
import { ProviderProfileFormValues } from '@interfaces/providers'
import { AppFormItem } from '@components/ui/AppFormItem'
import { AppInput } from '@components/ui/AppInput'

/**
 * Renders its **own** named `Form.Item`s rather than being one, so it takes no
 * `value`/`onChange` — `address` and `locationURL` are two separate slots and one control
 * contract cannot carry both. It must therefore never be placed inside a named
 * `Form.Item`, or antd would clone this wrapper and land its injected props on a `<Flex>`.
 */
type Props = {
  disabled?: boolean
}

export const ProviderProfileLocationInput: React.FC<Props> = ({ disabled }) => {
  const t = useTranslations('ProfileCreation')
  const form = Form.useFormInstance<ProviderProfileFormValues>()

  // Read once, for the initial disclosure state only. `Form.useWatch` would collapse the
  // field the moment the input is cleared, mid-edit.
  const [locationInputShown, setLocationInputShown] = useState(() => !!form.getFieldValue('locationURL'))

  const textareaRequiredMaxCharsCountRuleSet = useFormItemRules('required', 'maxCharsForInput')
  const urlRuleSet = useFormItemRules('required', 'url')

  const onRemoveUrlClick = useCallback(() => {
    // Cleared through the form instance, because the field is about to unmount — antd
    // keeps the value of an unmounted item otherwise, and a stale URL would be submitted.
    form.setFieldValue('locationURL', undefined)
    setLocationInputShown(false)
  }, [form])

  return (
    <Flex vertical gap={locationInputShown ? 16 : 0}>
      <AppFormItem name='address' label={t('address')} rules={textareaRequiredMaxCharsCountRuleSet}>
        <AppInput disabled={disabled} autoComplete='street-address' enterKeyHint='next' />
      </AppFormItem>

      {locationInputShown ? (
        <Flex gap={8} align='center'>
          {/* The `Form.Item` wraps only the input — wrapping the row would put antd's
              injected `value`/`onChange` on the `<Flex>` div instead of the control. */}
          <AppFormItem name='locationURL' label={t('locationURL')} rules={urlRuleSet} className='grow'>
            <AppInput
              type='url'
              disabled={disabled}
              autoComplete='url'
              inputMode='url'
              enterKeyHint='done'
            />
          </AppFormItem>
          <Button
            type='text'
            icon={<MinusCircleOutlined className='text-red-600' />}
            onClick={onRemoveUrlClick}
            aria-label={t('removeLocationURL')}
            className='min-h-11 min-w-11'
            disabled={disabled}
          />
        </Flex>
      ) : (
        <Button
          type='text'
          icon={<LinkOutlined />}
          className='w-fit pl-0'
          onClick={() => setLocationInputShown(true)}
          disabled={disabled}
        >
          Attach URL
        </Button>
      )}
    </Flex>
  )
}
