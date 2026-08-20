'use client'

import { FC, useCallback } from 'react'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { Button } from 'antd'
import { useRouter } from 'next/navigation'

type Props = {
  /** Used when there is no history to pop, e.g. on a shared deep link. */
  fallback: string
}

export const BackHistoryBtn: FC<Props> = ({ fallback }) => {
  const router = useRouter()

  const handleBackClick = useCallback(() => {
    // router.back() on a freshly-opened tab would navigate the user off-site.
    if (typeof window !== 'undefined' && window.history.length > 1) router.back()
    else router.push(fallback)
  }, [router, fallback])

  return (
    <Button
      type='text'
      aria-label='Go back'
      onClick={handleBackClick}
      className='min-h-11 min-w-11'
      icon={<ArrowLeftOutlined style={{ fontSize: 18 }} />}
    />
  )
}
