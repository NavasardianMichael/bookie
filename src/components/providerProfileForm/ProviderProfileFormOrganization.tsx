'use client'

import { useMemo, useRef } from 'react'
import { PlusOutlined } from '@ant-design/icons'
import { Button, Divider, InputRef, Select, Space } from 'antd'
import { DefaultOptionType } from 'antd/es/select'
import { useOrganizationsListStore } from '@store/organizations/list/store'
import { Organization } from '@store/organizations/single/types'
import { AppLink } from '@components/ui/bare/AppLink'

/**
 * Injected by `Form.Item` — see `ProviderProfileFormCategories` for why they are required.
 *
 * Two separate bugs used to live here. It wrote the key `organization` while the payload
 * builder read `organizationId`, so the selection was silently never submitted; and it
 * bound `defaultValue` rather than `value`, which makes the control uncontrolled and stops
 * edit mode from ever reflecting a stored organization.
 */
type Props = {
  value?: Organization['id']
  onChange?: (next: Organization['id']) => void
  disabled?: boolean
}

export const ProviderProfileOrganization: React.FC<Props> = ({ value, onChange, disabled }) => {
  const { list } = useOrganizationsListStore()
  const inputRef = useRef<InputRef>(null)

  const options: DefaultOptionType[] = useMemo(
    () =>
      list.allIds.map((organizationId) => {
        const organization = list.byId[organizationId]
        return { value: organization.id, label: organization.basic.name }
      }),
    [list.allIds, list.byId]
  )

  const addItem = (e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => {
    e.preventDefault()
    setTimeout(() => {
      inputRef.current?.focus()
    }, 0)
  }

  return (
    <Select
      value={value}
      onChange={onChange}
      popupRender={(menu) => (
        <>
          {menu}
          <Divider className='my-2' />
          <Space className='px-2 pb-1'>
            <Button type='text' icon={<PlusOutlined />} onClick={addItem} className='pl-0!'>
              <AppLink href={'/'}>Create a new organization</AppLink>
            </Button>
          </Space>
        </>
      )}
      options={options}
      disabled={disabled}
    />
  )
}
