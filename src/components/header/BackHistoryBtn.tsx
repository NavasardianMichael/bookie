'use client'

import { useCallback } from 'react'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { Button } from 'antd'
import { usePathname, useRouter } from 'next/navigation'
import { AppRoutePath } from '@interfaces/routes'
import { HEADER_UTILS_BY_ROUTE } from '@constants/header'
import { ROUTE_KEYS_BY_VALUES } from '@constants/routes'

export const BackHistoryBtn = () => {
  const router = useRouter()
  const pathName = usePathname() as AppRoutePath
  const key = ROUTE_KEYS_BY_VALUES[pathName!]
  const headerUtils = HEADER_UTILS_BY_ROUTE[key!]

  const handleBackClick = useCallback(() => {
    router.back()
  }, [router])

  if (headerUtils?.logo) return null

  return <Button type='text' onClick={handleBackClick} icon={<ArrowLeftOutlined style={{ fontSize: 20 }} />} />
}
