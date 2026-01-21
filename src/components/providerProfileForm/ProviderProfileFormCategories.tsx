'use client'

import { useMemo } from 'react'
import { PlusOutlined } from '@ant-design/icons'
import { Button, Divider, FormInstance, Select, Space } from 'antd'
import type { DefaultOptionType, SelectProps } from 'antd/es/select'
import { useCategoriesListStore } from '@store/categories/list/store'
import { AppFormProps } from '@interfaces/forms'
import { ProviderProfileFormValues } from '@interfaces/providers'
import SelectSuffix from '@components/shared/SelectSuffix'
import AppLink from '@components/ui/AppLink'

type Props = AppFormProps<ProviderProfileFormValues> & {
  form: FormInstance
}

const MAX_COUNT = 3

const ProviderProfileFormCategories: React.FC<Props> = ({ formik, form }) => {
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

  const onOptionChange: SelectProps['onChange'] = async (ids) => {
    await formik.setFieldValue('categoryIds', ids)
    form.validateFields(['categoryIds'])
  }

  return (
    <Select
      size='large'
      mode='tags'
      suffixIcon={<SelectSuffix value={formik.values.categoryIds.length} limit={MAX_COUNT} />}
      popupRender={(menu) => (
        <>
          {menu}
          <Divider style={{ margin: '8px 0' }} />
          <Space style={{ padding: '0 8px 4px' }}>
            <Button type='text' icon={<PlusOutlined />}>
              <AppLink href={'/'}>Create a new category</AppLink>
            </Button>
          </Space>
        </>
      )}
      onChange={onOptionChange}
      value={formik.values.categoryIds}
      options={options}
      maxCount={MAX_COUNT}
      disabled={formik.isSubmitting}
    />
  )
}

export default ProviderProfileFormCategories
