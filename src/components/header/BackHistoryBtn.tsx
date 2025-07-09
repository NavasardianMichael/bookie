'use client'

import { LeftOutlined } from '@ant-design/icons'
import { HEADER_UTILS_BY_ROUTE } from '@constants/header'
import { ROUTE_KEYS_BY_VALUES } from '@constants/routes'
import { AppRoutePath } from '@interfaces/routes'
import { Button } from 'antd'
import { usePathname, useRouter } from 'next/navigation'

export const BackHistoryBtn = () => {
  const router = useRouter()
  const pathName = usePathname() as AppRoutePath
  const key = ROUTE_KEYS_BY_VALUES[pathName]
  const headerUtils = HEADER_UTILS_BY_ROUTE[key]

  if (!headerUtils?.arrow) return null

  return <Button type='text' onClick={() => router.back()} icon={<LeftOutlined />} />
}
