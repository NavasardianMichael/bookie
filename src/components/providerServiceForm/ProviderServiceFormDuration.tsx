'use client'

import React from 'react'
import { AutoComplete, AutoCompleteProps } from 'antd'
import { AppFormProps } from '@interfaces/forms'
import { ProviderServiceFormValues } from '@interfaces/services'

import '@ant-design/v5-patch-for-react-19'

type Props = AppFormProps<ProviderServiceFormValues>

const ProviderServiceFormDuration: React.FC<Props> = ({ formik }) => {
  const [text, setText] = React.useState<string>('')
  const [options, setOptions] = React.useState<{ value: string }[]>([])

  const onSelect: AutoCompleteProps['onSelect'] = (option) => {
    const { value } = option
    setText(value)
    formik.setFieldValue('duration', value)
  }

  const onSearch: AutoCompleteProps['onSearch'] = (text) => {
    const value = +text
    if (isNaN(value) || value <= 0) return
    setText(text)

    let hours = 0
    if (value / 12 > 5) {
      hours = Math.floor(value / 60)
    }
    const newOptions = Array.from({ length: 12 }, (_, i) => ({
      value: `${hours ? `${hours} hours, ` : ''}${(i + 1) * 5} minutes`,
    }))
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
    />
  )
}

export default ProviderServiceFormDuration
