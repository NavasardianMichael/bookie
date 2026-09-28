'use client'

import { FC } from 'react'
import { useTranslations } from 'next-intl'
import { BasicOrganization } from '@store/organizations/single/types'
import { AppButton } from '@components/ui/AppButton'
import { AppConfirmModal } from '@components/ui/AppConfirmModal'
import { AppText } from '@components/ui/bare/AppText'
import { BuildingIcon } from '@components/ui/icons'

type Props = {
  /** The new organization's name, as it would be created. */
  name: string
  matches: BasicOrganization[]
  onUseExisting: (organization: BasicOrganization) => void
  onCreateNew: () => void
  /** Back to the form, nothing submitted. */
  onCancel: () => void
}

/**
 * Asked on submit when a new organization's name is already, or nearly, taken: join one of
 * the existing organizations, or create the new one anyway. Two real clinics can share a
 * name, so creating stays possible — it just stops being something that happens by accident.
 */
export const SimilarOrganizationsDialog: FC<Props> = ({ name, matches, onUseExisting, onCreateNew, onCancel }) => {
  const t = useTranslations('Auth.organization')

  return (
    <AppConfirmModal
      open
      title={t('similarTitle')}
      description={t('similarDescription', { name })}
      icon={<BuildingIcon className='h-5 w-5' />}
      okText={t('createNew')}
      onConfirm={onCreateNew}
      onCancel={onCancel}
    >
      <ul className='flex flex-col gap-2'>
        {matches.map((organization) => {
          const categories = organization.basic.categories.map((category) => category.name).join(', ')
          return (
            <li
              key={organization.id}
              className='border-brand-border rounded-brand flex items-center justify-between gap-3 border p-3'
            >
              <span className='flex min-w-0 flex-col'>
                <AppText as='strong' size='body-sm' className='truncate'>
                  {organization.basic.name}
                </AppText>
                {categories && (
                  <AppText size='caption' tone='muted' className='truncate'>
                    {categories}
                  </AppText>
                )}
              </span>
              <AppButton type='primary' ghost size='small' onClick={() => onUseExisting(organization)}>
                {t('useExisting')}
              </AppButton>
            </li>
          )
        })}
      </ul>
    </AppConfirmModal>
  )
}
