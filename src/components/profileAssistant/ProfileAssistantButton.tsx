'use client'

import { FC } from 'react'
import { ThunderboltOutlined } from '@ant-design/icons'
import { Tooltip } from 'antd'
import { useTranslations } from 'next-intl'
import { AppButton } from '@components/ui/AppButton'

type Props = {
  onClick: () => void
}

/**
 * The profile assistant's way in: an icon-only button beside the workspace switch on every
 * provider settings tab. The tooltip answers hover and keyboard focus, not a click: a click
 * opens the sheet, and a click-triggered tooltip would stay painted over it (its z-index is
 * above the modal's). On touch the sheet's own intro says the same thing.
 */
export const ProfileAssistantButton: FC<Props> = ({ onClick }) => {
  const t = useTranslations('Settings.assistant')

  return (
    <Tooltip title={t('tooltip')} trigger={['hover', 'focus']} placement='bottomRight'>
      <AppButton
        type='primary'
        icon={<ThunderboltOutlined aria-hidden />}
        aria-label={t('buttonLabel')}
        onClick={onClick}
        className='shrink-0'
      />
    </Tooltip>
  )
}
