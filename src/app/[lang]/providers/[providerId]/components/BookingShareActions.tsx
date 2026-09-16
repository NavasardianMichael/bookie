'use client'

import { FC, useState } from 'react'
import { CopyOutlined, DownloadOutlined, LinkOutlined, QrcodeOutlined, ShareAltOutlined } from '@ant-design/icons'
import { App, Image } from 'antd'
import { useTranslations } from 'next-intl'
import { BookingSummaryData, formatBookingSummaryPlainText } from '@helpers/bookingSummary'
import { processError } from '@helpers/error'
import { toQrDataUrl } from '@helpers/qr'
import { AppButton } from '@components/ui/AppButton'
import { useBookingSummaryFields } from './BookingSummary'

type Props = {
  manageUrl: string
  booking: BookingSummaryData
}

const QR_FILENAME = 'booking-qr.png'

const isAbort = (err: unknown): boolean => err instanceof DOMException && err.name === 'AbortError'

export const BookingShareActions: FC<Props> = ({ manageUrl, booking }) => {
  const t = useTranslations('Booking')
  const tCommon = useTranslations('Common')
  const { message } = App.useApp()
  const fields = useBookingSummaryFields(booking)

  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const shareTitle = t('shareBookingTitle', { name: booking.providerName })

  const copyText = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      message.success(tCommon('copied'))
    } catch {
      message.error(tCommon('copyFailed'))
    }
  }

  const shareUrl = async () => {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: shareTitle, url: manageUrl })
        return
      } catch (err) {
        if (isAbort(err)) return
      }
    }

    await copyText(manageUrl)
  }

  const shareQr = async (dataUrl: string) => {
    try {
      const blob = await (await fetch(dataUrl)).blob()
      const file = new File([blob], QR_FILENAME, { type: 'image/png' })
      const withFile = { files: [file], title: shareTitle, text: manageUrl }

      if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
        await navigator.share(withFile)
        return
      }

      if (typeof navigator.share === 'function') {
        await navigator.share({ title: shareTitle, url: manageUrl })
        return
      }
    } catch (err) {
      if (isAbort(err)) return
    }

    await copyText(manageUrl)
  }

  const generateQr = async () => {
    setIsGenerating(true)
    try {
      setQrDataUrl(await toQrDataUrl(manageUrl))
    } catch (err) {
      message.error(processError(err).message)
    } finally {
      setIsGenerating(false)
    }
  }

  const downloadQr = (dataUrl: string) => {
    const link = document.createElement('a')
    link.href = dataUrl
    link.download = QR_FILENAME
    link.rel = 'noopener'
    link.click()
  }

  return (
    <div className='flex w-full flex-col gap-2'>
      <AppButton className='w-full justify-start' icon={<ShareAltOutlined />} onClick={() => void shareUrl()}>
        {t('shareBooking')}
      </AppButton>
      <AppButton
        className='w-full justify-start'
        icon={<LinkOutlined />}
        onClick={() => void copyText(manageUrl)}
      >
        {t('copyBookingUrl')}
      </AppButton>
      <AppButton
        className='w-full justify-start'
        icon={<CopyOutlined />}
        onClick={() => void copyText(formatBookingSummaryPlainText(fields))}
      >
        {t('copyBookingDetails')}
      </AppButton>
      <AppButton
        className='w-full justify-start'
        icon={<QrcodeOutlined />}
        loading={isGenerating}
        onClick={() => void generateQr()}
      >
        {t('generateQr')}
      </AppButton>

      {qrDataUrl ? (
        <div className='flex flex-col gap-2 pt-1'>
          <div className='w-48'>
            <Image alt={t('qrAlt')} src={qrDataUrl} className='w-full' />
          </div>
          <AppButton
            className='w-full justify-start'
            icon={<DownloadOutlined />}
            onClick={() => downloadQr(qrDataUrl)}
          >
            {t('downloadQr')}
          </AppButton>
          <AppButton
            className='w-full justify-start'
            icon={<ShareAltOutlined />}
            onClick={() => void shareQr(qrDataUrl)}
          >
            {t('shareQr')}
          </AppButton>
        </div>
      ) : null}
    </div>
  )
}
