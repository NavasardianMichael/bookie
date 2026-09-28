'use client'

import { FC, useEffect, useMemo, useRef, useState } from 'react'
import { DisconnectOutlined, PlusOutlined } from '@ant-design/icons'
import { Form } from 'antd'
import type { Rule } from 'antd/es/form'
import type { RefSelectProps } from 'antd/es/select'
import { useTranslations } from 'next-intl'
import { useValidateAfterSubmit } from '@hooks/useValidateAfterSubmit'
import { OrganizationValue } from '@interfaces/auth'
import { AppButton } from '@components/ui/AppButton'
import { AppFormItem } from '@components/ui/AppFormItem'
import { FieldLabel } from './FieldLabel'
import { NewOrganizationFields } from './NewOrganizationFields'
import { OrganizationSearchField } from './OrganizationSearchField'

type Props = {
  disabled?: boolean
  /** The provider prototype labels fields in navy semibold rather than charcoal bold. */
  labelClassName?: string
}

type FieldsProps = Props & {
  onDetach: () => void
}

const NAME_INPUT_ID = 'organization'

/**
 * The open section: the name search, a Detach button, and — once "add as new" is chosen —
 * the new organization's own fields.
 *
 * Its own component so that detaching unmounts it: the submit-first validation state resets
 * with it, and every item inside is `preserve={false}`, so the form forgets the organization
 * entirely rather than submitting a stale one.
 */
const OrganizationFields: FC<FieldsProps> = ({ onDetach, disabled, labelClassName }) => {
  const t = useTranslations('Auth')
  const tValidation = useTranslations('Validation')
  const organization = Form.useWatch<OrganizationValue | undefined>('organization')
  const { validateTrigger, markChecked } = useValidateAfterSubmit()
  const searchRef = useRef<RefSelectProps>(null)
  const nameLabel = t('organization.name')

  // The section opens on a click, so the search is already where the user's attention is.
  useEffect(() => {
    searchRef.current?.focus()
  }, [])

  const nameRules = useMemo<Rule[]>(
    () => [
      {
        validator: (_: unknown, value: OrganizationValue | undefined) => {
          markChecked()
          if (!value?.name?.trim()) return Promise.reject(new Error(tValidation('required', { label: nameLabel })))
          if (value.id || value.isNew) return Promise.resolve()
          return Promise.reject(new Error(t('organization.chooseOrAdd')))
        },
      },
    ],
    [markChecked, nameLabel, t, tValidation]
  )

  return (
    <div className='border-brand-border bg-surface-sunken rounded-brand flex flex-col gap-4 border p-4'>
      <div className='flex flex-col gap-1.5'>
        <div className='flex items-center justify-between gap-2'>
          <FieldLabel htmlFor={NAME_INPUT_ID} requirement='Required' className={labelClassName}>
            {nameLabel}
          </FieldLabel>
          <AppButton type='text' size='small' icon={<DisconnectOutlined />} onClick={onDetach} disabled={disabled}>
            {t('organization.detach')}
          </AppButton>
        </div>

        <AppFormItem
          name='organization'
          rules={nameRules}
          validateTrigger={validateTrigger}
          messageVariables={{ label: nameLabel }}
          preserve={false}
          extra={organization?.id ? t('organization.linked') : undefined}
        >
          <OrganizationSearchField
            ref={searchRef}
            id={NAME_INPUT_ID}
            placeholder={t('organization.searchPlaceholder')}
            disabled={disabled}
          />
        </AppFormItem>
      </div>

      {organization?.isNew && <NewOrganizationFields disabled={disabled} labelClassName={labelClassName} />}
    </div>
  )
}

/**
 * A provider's organization at registration — optional, so it starts as one dashed
 * "Add organization" button rather than a field. Opening it shows the name search; picking a
 * suggestion links that organization, and "add as new" reveals the fields its public page
 * needs, so the organization is registered in the same submit as the provider.
 *
 * Shared by email registration and the Google completion step, the two ways a provider
 * account is created. Renders its own named items (`organization`, `newOrganization.*`), so
 * it must not be placed inside a named `Form.Item`; `toOrganizationFields` turns them into
 * the payload.
 */
export const OrganizationSection: FC<Props> = ({ disabled, labelClassName }) => {
  const t = useTranslations('Auth.organization')
  const [isOpen, setIsOpen] = useState(false)

  if (!isOpen) {
    return (
      <AppButton type='dashed' block icon={<PlusOutlined />} onClick={() => setIsOpen(true)} disabled={disabled}>
        {t('add')}
      </AppButton>
    )
  }

  return <OrganizationFields onDetach={() => setIsOpen(false)} disabled={disabled} labelClassName={labelClassName} />
}
