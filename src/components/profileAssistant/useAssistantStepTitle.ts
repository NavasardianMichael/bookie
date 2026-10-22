'use client'

import { useTranslations } from 'next-intl'
import { AssistantStep } from '@helpers/profileAssistant'

/**
 * A review step's title. Each settings step is named exactly as its tab is in the sidebar
 * (`Settings.nav`), so the provider recognises where the draft lands; only the summary has
 * words of its own.
 */
export const useAssistantStepTitle = (): ((step: AssistantStep) => string) => {
  const t = useTranslations('Settings')
  return (step) => (step === 'summary' ? t('assistant.summary') : t(`nav.${step}`))
}
