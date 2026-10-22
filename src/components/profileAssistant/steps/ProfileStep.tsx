'use client'

import { FC } from 'react'
import { CategoriesSection } from '@app/[lang]/auth/components/CategoriesSection'
import { FieldLabel } from '@app/[lang]/auth/components/FieldLabel'
import { useTranslations } from 'next-intl'
import { useFormItemRules } from '@hooks/useFormItemRules'
import { MAX_CHARS_FOR_TEXTAREA } from '@constants/form'
import { AppFormItem } from '@components/ui/AppFormItem'
import { AppInput } from '@components/ui/AppInput'
import { AppTextArea } from '@components/ui/AppTextArea'

/** The Profile tab's text fields and categories. The photo and phone stay on the tab itself. */
export const ProfileStep: FC = () => {
  const t = useTranslations('Settings')
  const nameRules = useFormItemRules('required', 'maxCharsForName')
  const descriptionRules = useFormItemRules('maxCharsForTextarea')

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex flex-col gap-1.5'>
        <FieldLabel htmlFor='assistant-full-name'>{t('profile.fullName')}</FieldLabel>
        <AppFormItem name='fullName' rules={nameRules} messageVariables={{ label: t('profile.fullName') }}>
          <AppInput id='assistant-full-name' autoComplete='name' />
        </AppFormItem>
      </div>
      <div className='flex flex-col gap-1.5'>
        <FieldLabel htmlFor='assistant-description' requirement='Optional'>
          {t('profile.description')}
        </FieldLabel>
        <AppFormItem name='description' rules={descriptionRules} messageVariables={{ label: t('profile.description') }}>
          <AppTextArea
            id='assistant-description'
            autoSize={{ minRows: 3, maxRows: 6 }}
            maxLength={MAX_CHARS_FOR_TEXTAREA}
            showCount
          />
        </AppFormItem>
      </div>
      <CategoriesSection />
    </div>
  )
}
