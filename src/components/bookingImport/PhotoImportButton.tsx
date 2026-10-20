'use client'

import { FC, useState } from 'react'
import { CameraOutlined } from '@ant-design/icons'
import { App } from 'antd'
import { useTranslations } from 'next-intl'
import { AppButton } from '@components/ui/AppButton'
import { PhotoImportSheet } from './PhotoImportSheet'

type Props = {
  /** The bookings went in — refresh what lists them. */
  onImported: () => void
}

/**
 * The `/bookings` header action that turns a photo of handwritten bookings into real ones.
 * Provider side only; `BookingsClient` decides where it shows.
 */
export const PhotoImportButton: FC<Props> = ({ onImported }) => {
  const t = useTranslations('Bookings.import')
  const { message } = App.useApp()
  const [open, setOpen] = useState(false)

  const handleImported = (count: number) => {
    setOpen(false)
    void message.success(t('added', { count }))
    onImported()
  }

  return (
    <>
      <AppButton icon={<CameraOutlined />} onClick={() => setOpen(true)}>
        {t('button')}
      </AppButton>
      <PhotoImportSheet open={open} onClose={() => setOpen(false)} onImported={handleImported} />
    </>
  )
}
