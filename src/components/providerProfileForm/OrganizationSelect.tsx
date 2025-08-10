'use client'

import { useMemo, useRef } from 'react'
import { PlusOutlined } from '@ant-design/icons'
import { Button, Divider, InputRef, Select, Space } from 'antd'
import { DefaultOptionType, SelectProps } from 'antd/es/select'
import { FormikProps } from 'formik'
import { useOrganizationsListStore } from '@store/organizations/list/store'
import { ProviderProfileFormValues } from '@interfaces/providers'
import AppLink from '@components/ui/AppLink'

type Props = {
  formik: FormikProps<ProviderProfileFormValues>
}

const OrganizationSelect: React.FC<Props> = ({ formik }) => {
  const { list } = useOrganizationsListStore()
  const inputRef = useRef<InputRef>(null)

  const options: DefaultOptionType[] = useMemo(() => {
    return list.allIds.map((organizationId) => {
      // eslint-disable-next-line security/detect-object-injection
      const organization = list.byId[organizationId]
      return {
        value: organization.id,
        label: organization.basic.name,
      }
    })
  }, [list.allIds, list.byId])

  const addItem = (e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => {
    e.preventDefault()
    setTimeout(() => {
      inputRef.current?.focus()
    }, 0)
  }

  const onOptionChange: SelectProps['onChange'] = (id) => {
    formik.setFieldValue('organization', id)
  }

  return (
    <Select
      size='large'
      popupRender={(menu) => (
        <>
          {menu}
          <Divider style={{ margin: '8px 0' }} />
          <Space style={{ padding: '0 8px 4px' }}>
            <Button type='text' icon={<PlusOutlined />} onClick={addItem} className='pl-0!'>
              <AppLink href={'/'}>Create a new organization</AppLink>
            </Button>
          </Space>
        </>
      )}
      onChange={onOptionChange}
      defaultValue={formik.values.organization}
      options={options}
    />
  )
}

export default OrganizationSelect
