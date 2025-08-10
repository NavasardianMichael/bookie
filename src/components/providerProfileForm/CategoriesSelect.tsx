'use client'

import { useMemo, useRef } from 'react'
import { PlusOutlined } from '@ant-design/icons'
import { Button, Divider, InputRef, Select, Space } from 'antd'
import { DefaultOptionType, SelectProps } from 'antd/es/select'
import { FormikProps } from 'formik'
import { useCategoriesListStore } from '@store/categories/list/store'
import { ProviderProfileFormValues } from '@interfaces/providers'
import SelectSuffix from '@components/shared/SelectSuffix'
import AppLink from '@components/ui/AppLink'

type Props = {
  formik: FormikProps<ProviderProfileFormValues>
}

const MAX_COUNT = 3

const CategoriesSelect: React.FC<Props> = ({ formik }) => {
  const { list } = useCategoriesListStore()
  const inputRef = useRef<InputRef>(null)

  const options: DefaultOptionType[] = useMemo(() => {
    return list.allIds.map((categoryId) => {
      // eslint-disable-next-line security/detect-object-injection
      const category = list.byId[categoryId]
      return {
        value: category.id,
        label: category.name,
      }
    })
  }, [list.allIds, list.byId])

  const addItem = (e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => {
    e.preventDefault()
    setTimeout(() => {
      inputRef.current?.focus()
    }, 0)
  }

  const onOptionChange: SelectProps['onChange'] = (ids) => {
    formik.setFieldValue('categories', ids)
  }

  return (
    <Select
      size='large'
      mode='multiple'
      suffixIcon={<SelectSuffix value={formik.values.categories.length} limit={MAX_COUNT} />}
      popupRender={(menu) => (
        <>
          {menu}
          <Divider style={{ margin: '8px 0' }} />
          <Space style={{ padding: '0 8px 4px' }}>
            <Button type='text' icon={<PlusOutlined />} onClick={addItem}>
              <AppLink href={'/'}>Create a new category</AppLink>
            </Button>
          </Space>
        </>
      )}
      onChange={onOptionChange}
      defaultValue={formik.values.categories}
      options={options}
      maxCount={MAX_COUNT}
    />
  )
}

export default CategoriesSelect
