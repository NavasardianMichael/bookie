'use client'

import { ArrowLeftOutlined } from '@ant-design/icons'
import { Button } from 'antd'
import { usePathname, useRouter } from 'next/navigation'
import { AppRoutePath } from '@interfaces/routes'
import { HEADER_UTILS_BY_ROUTE } from '@constants/header'
import { ROUTE_KEYS_BY_VALUES } from '@constants/routes'

export const BackHistoryBtn = () => {
  const router = useRouter()
  const pathName = usePathname() as AppRoutePath
  const key = ROUTE_KEYS_BY_VALUES[pathName]
  const headerUtils = HEADER_UTILS_BY_ROUTE[key]

  if (!headerUtils?.arrow) return null

  return <Button type='text' onClick={() => router.back()} icon={<ArrowLeftOutlined style={{ fontSize: 20 }} />} />
}
