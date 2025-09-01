'use client'

import React from 'react'
import { AutoComplete, AutoCompleteProps, FormInstance } from 'antd'
import { DefaultOptionType } from 'antd/es/select'
import { AppFormProps } from '@interfaces/forms'
import { ProviderServiceFormValues } from '@interfaces/services'
import { minsToDisplayFormat } from '@constants/dates'

type Props = AppFormProps<ProviderServiceFormValues> & {
  form: FormInstance
}

const ProviderServiceFormDuration: React.FC<Props> = ({ formik, form }) => {
  const [text, setText] = React.useState<string>('')
  const [options, setOptions] = React.useState<DefaultOptionType[]>([])

  const onSelect: AutoCompleteProps['onSelect'] = async (_, option) => {
    const { value } = option
    if (!value) return

    setText(value?.toString())
    await formik.setFieldValue('duration', value)
    form.setFieldValue('duration', value)
  }

  const onSearch: AutoCompleteProps['onSearch'] = (text) => {
    const value = +text
    if (isNaN(value) || +value < 0) return
    setText(text)

    const { hours } = minsToDisplayFormat(value)
    const newOptions = Array.from({ length: 12 }, (_, i) => {
      const base = hours * 60 + (i + 1) * 5
      return {
        value: base.toString(),
        label: minsToDisplayFormat(base).text,
        key: base.toString(),
      } as DefaultOptionType
    })
    setOptions(newOptions)
  }

  return (
    <AutoComplete
      options={options}
      onSelect={onSelect}
      size='large'
      value={text}
      onSearch={onSearch}
      placeholder='input here'
      disabled={formik.isSubmitting}
      suffixIcon={<span className='mr-2'>minutes</span>}
    />
  )
}

export default ProviderServiceFormDuration
