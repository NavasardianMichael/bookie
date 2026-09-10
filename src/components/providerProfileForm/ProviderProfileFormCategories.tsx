'use client'

import { useMemo } from 'react'
import { PlusOutlined } from '@ant-design/icons'
import { Button, Divider, Select, Space } from 'antd'
import type { DefaultOptionType } from 'antd/es/select'
import { useCategoriesListStore } from '@store/categories/list/store'
import { Category } from '@store/categories/single/types'
import { SelectSuffix } from '@components/shared/SelectSuffix'
import { AppLink } from '@components/ui/bare/AppLink'

/**
 * `value` and `onChange` are **injected by `Form.Item`** — they are not passed by the
 * parent. A component used as the direct child of a named `Form.Item` must accept both, or
 * antd's injected props land nowhere and the store slot for `categoryIds` is never written.
 * That is exactly what broke this field before: the rules said `required` + `min: 1` on a
 * slot nothing ever wrote, so the profile form could not be submitted at all.
 */
type Props = {
  value?: Category['id'][]
  onChange?: (next: Category['id'][]) => void
  disabled?: boolean
}

const MAX_COUNT = 3

export const ProviderProfileFormCategories: React.FC<Props> = ({ value = [], onChange, disabled }) => {
  const { list } = useCategoriesListStore()

  const options: DefaultOptionType[] = useMemo(
    () =>
      list.allIds.map((categoryId) => {
        const category = list.byId[categoryId]
        return { value: category.id, label: category.name }
      }),
    [list.allIds, list.byId]
  )

  return (
    <Select
      mode='tags'
      // No manual `form.validateFields` any more: `AppFormItem` sets
      // `validateTrigger='onChange'`, so writing through `onChange` revalidates on its own.
      value={value}
      onChange={onChange}
      suffixIcon={<SelectSuffix value={value.length} limit={MAX_COUNT} />}
      popupRender={(menu) => (
        <>
          {menu}
          <Divider className='my-2' />
          <Space className='px-2 pb-1'>
            <Button type='text' icon={<PlusOutlined />}>
              <AppLink href={'/'}>Create a new category</AppLink>
            </Button>
          </Space>
        </>
      )}
      options={options}
      maxCount={MAX_COUNT}
      disabled={disabled}
    />
  )
}
