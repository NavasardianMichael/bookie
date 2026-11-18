'use client'

import { FC, useEffect, useState } from 'react'
import { MessageOutlined } from '@ant-design/icons'
import { Switch } from 'antd'
import { useTranslations } from 'next-intl'
import { getAssistantAPI, putVisitorAssistantAPI } from '@api/assistant/main'
import { VisitorAssistantSetting as Setting } from '@api/assistant/types'
import { useErrorToast } from '@hooks/useErrorToast'
import { ROUTES } from '@constants/routes'
import { AppLink } from '@components/ui/bare/AppLink'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { AppText } from '@components/ui/bare/AppText'
import { AppTitle } from '@components/ui/bare/AppTitle'
import { ErrorAlert } from '@components/ui/ErrorAlert'
import { Surface } from '@components/ui/layout/Surface'

/**
 * The public page's AI assistant switch, on the Advanced settings tab. Saves on its own the
 * moment it is flipped — like Telegram and the calendar feed, outside the tab's Save — because
 * it is not part of the page's drafted look. Premium only: below it the switch is disabled with
 * a link to the Plan tab, and the API refuses the write regardless.
 */
export const VisitorAssistantSetting: FC = () => {
  const t = useTranslations('Settings.visitorAssistant')
  const toast = useErrorToast()
  const [setting, setSetting] = useState<Setting | null>(null)
  const [loadError, setLoadError] = useState<unknown>(null)
  const [attempt, setAttempt] = useState(0)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    void getAssistantAPI()
      .then((state) => {
        if (cancelled) return
        setSetting(state.visitor)
        setLoadError(null)
      })
      .catch((error: unknown) => {
        if (!cancelled) setLoadError(error)
      })
    return () => {
      cancelled = true
    }
  }, [attempt])

  const toggle = async (enabled: boolean): Promise<void> => {
    setSaving(true)
    try {
      setSetting(await putVisitorAssistantAPI({ enabled }))
    } catch (error) {
      toast(error, { title: t('failed') })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Surface className='flex flex-col gap-3'>
      <div className='flex items-start justify-between gap-4'>
        <div className='flex flex-col gap-1'>
          <AppTitle level='h2' size='h3' className='flex items-center gap-2'>
            <MessageOutlined className='text-brand' />
            {t('title')}
          </AppTitle>
          <AppParagraph size='body-sm'>{t('body')}</AppParagraph>
        </div>
        {setting && (
          <Switch
            aria-label={t('title')}
            checked={setting.enabled && setting.allowed}
            disabled={!setting.allowed}
            loading={saving}
            onChange={(checked) => void toggle(checked)}
          />
        )}
      </div>
      {loadError !== null && <ErrorAlert error={loadError} onRetry={() => setAttempt((current) => current + 1)} />}
      {setting && !setting.allowed && (
        <AppText size='body-sm' tone='muted'>
          {t.rich('locked', { link: (chunks) => <AppLink href={ROUTES.providerProfilePlan}>{chunks}</AppLink> })}
        </AppText>
      )}
    </Surface>
  )
}
