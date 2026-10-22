'use client'

import { FC } from 'react'
import { CheckCircleOutlined } from '@ant-design/icons'
import { useTranslations } from 'next-intl'
import { AssistantProposal } from '@api/profileAssistant/types'
import { ASSISTANT_STEPS } from '@constants/profileAssistant'
import { changedSteps, removedServices, serviceStatus } from '@helpers/profileAssistant'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { AppText } from '@components/ui/bare/AppText'
import { useAssistantStepTitle } from '../useAssistantStepTitle'

type Props = {
  current: AssistantProposal
  /** The review as it stands — the proposal with every edit made to it. */
  reviewed: AssistantProposal
}

/** The last step: what Approve is about to change, section by section, before anything is saved. */
export const SummaryStep: FC<Props> = ({ current, reviewed }) => {
  const t = useTranslations('Settings.assistant')
  const stepTitle = useAssistantStepTitle()
  const changed = changedSteps(current, reviewed)
  const sections = ASSISTANT_STEPS.filter((step) => changed.has(step))
  const statuses = reviewed.services.map((service) => serviceStatus(service, current.services))

  return (
    <div className='flex flex-col gap-4'>
      {sections.length ? (
        <div className='flex flex-col gap-2'>
          <AppText className='font-semibold'>{t('summaryChanged')}</AppText>
          <ul className='m-0 flex list-none flex-col gap-1.5 p-0'>
            {sections.map((step) => (
              <li key={step} className='flex items-start gap-2'>
                <CheckCircleOutlined aria-hidden className='text-brand mt-1' />
                <span>
                  <AppText className='font-medium'>{stepTitle(step)}</AppText>
                  {step === 'services' && (
                    <AppText size='body-sm' tone='muted' className='block'>
                      {t('summaryServices', {
                        created: statuses.filter((status) => status === 'new').length,
                        updated: statuses.filter((status) => status === 'changed').length,
                        removed: removedServices(current.services, reviewed.services).length,
                      })}
                    </AppText>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <AppParagraph size='body-sm' className='m-0'>
          {t('summaryNone')}
        </AppParagraph>
      )}

      <div className='flex flex-col gap-1'>
        <AppParagraph size='body-sm' className='m-0'>
          {t('summaryBody')}
        </AppParagraph>
        <AppParagraph size='caption' tone='muted' className='m-0'>
          {t('summaryPhotos')}
        </AppParagraph>
      </div>
    </div>
  )
}
