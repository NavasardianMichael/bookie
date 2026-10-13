'use client'

import { FC } from 'react'
import { useTranslations } from 'next-intl'
import { MAX_PROVIDER_CATEGORIES } from '@constants/form'
import { AppFormItem } from '@components/ui/AppFormItem'
import { CategoriesField } from './CategoriesField'
import { FieldLabel } from './FieldLabel'

type Props = {
  disabled?: boolean
  /** The provider prototype labels fields in navy semibold rather than charcoal bold. */
  labelClassName?: string
}

const INPUT_ID = 'categories'

/**
 * A provider's Categories field with its label — the one block provider registration (email
 * and Google), becoming a provider and the settings Profile tab all render. The value lives
 * under the form's `categories` key as `CategoryValue[]`; `toCategoryChoices` turns it into
 * the payload, after `useSimilarCategoryCheck` has asked about any near-duplicate.
 */
export const CategoriesSection: FC<Props> = ({ disabled, labelClassName }) => {
  const t = useTranslations('Auth.categories')

  return (
    <div className='flex flex-col gap-1.5'>
      <FieldLabel htmlFor={INPUT_ID} requirement='Optional' className={labelClassName}>
        {t('label')}
      </FieldLabel>
      <AppFormItem name='categories' hasFeedback={false} extra={t('hint', { max: MAX_PROVIDER_CATEGORIES })}>
        <CategoriesField id={INPUT_ID} disabled={disabled} />
      </AppFormItem>
    </div>
  )
}
