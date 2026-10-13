'use client'

import { FC } from 'react'
import { TagOutlined } from '@ant-design/icons'
import { useTranslations } from 'next-intl'
import { NamedCategory } from '@store/categories/single/types'
import { translateCategoryName } from '@helpers/categoryName'
import { AppButton } from '@components/ui/AppButton'
import { AppConfirmModal } from '@components/ui/AppConfirmModal'
import { AppText } from '@components/ui/bare/AppText'

type Props = {
  /** The new category's name, as it would be created. */
  name: string
  matches: NamedCategory[]
  onUseExisting: (category: NamedCategory) => void
  onCreateNew: () => void
  /** Back to the form, nothing submitted. */
  onCancel: () => void
}

/**
 * Asked on submit when a category the provider is adding is already, or nearly, there: use
 * the existing one, or add the new one anyway. The Organization field's
 * `SimilarOrganizationsDialog`, for categories — two close names can still be two real
 * specialties, so adding stays possible; it just stops happening by accident.
 */
export const SimilarCategoriesDialog: FC<Props> = ({ name, matches, onUseExisting, onCreateNew, onCancel }) => {
  const t = useTranslations('Auth.categories')
  const tCategories = useTranslations('Categories')

  return (
    <AppConfirmModal
      open
      title={t('similarTitle')}
      description={t('similarDescription', { name })}
      icon={<TagOutlined />}
      okText={t('createNew')}
      onConfirm={onCreateNew}
      onCancel={onCancel}
    >
      <ul className='flex flex-col gap-2'>
        {matches.map((category) => (
          <li
            key={category.id}
            className='border-brand-border rounded-brand flex items-center justify-between gap-3 border p-3'
          >
            <AppText as='strong' size='body-sm' className='min-w-0 truncate'>
              {translateCategoryName(category.name, tCategories)}
            </AppText>
            <AppButton type='primary' ghost size='small' onClick={() => onUseExisting(category)}>
              {t('useExisting')}
            </AppButton>
          </li>
        ))}
      </ul>
    </AppConfirmModal>
  )
}
