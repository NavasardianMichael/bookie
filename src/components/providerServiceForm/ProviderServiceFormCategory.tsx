'use client'

import { useMemo } from 'react'
import { FormInstance, Select } from 'antd'
import { DefaultOptionType, SelectProps } from 'antd/es/select'
import { useCategoriesListStore } from '@store/categories/list/store'
import { AppFormProps } from '@interfaces/forms'
import { ProviderServiceFormValues } from '@interfaces/services'

type Props = AppFormProps<ProviderServiceFormValues> & {
  form: FormInstance
}

const ProviderServiceFormCategory: React.FC<Props> = ({ formik, form }) => {
  const { list } = useCategoriesListStore()

  const options: DefaultOptionType[] = useMemo(() => {
    return list.allIds.map((categoryId) => {
      const category = list.byId[categoryId]
      return {
        value: category.id,
        label: category.name,
      }
    })
  }, [list.allIds, list.byId])

  const onOptionChange: SelectProps['onChange'] = async (value) => {
    await formik.setFieldValue('categoryId', value.id)
    form.validateFields(['categoryId'])
  }

  return (
    <Select
      size='large'
      onChange={onOptionChange}
      value={formik.values.categoryId}
      options={options}
      disabled={formik.isSubmitting}
    />
  )
}

export default ProviderServiceFormCategory
