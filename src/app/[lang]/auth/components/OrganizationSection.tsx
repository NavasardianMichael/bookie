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
  /**
   * `settings` is the provider profile: the fields stay on screen, an empty name means no
   * organization, and Detach shows only while one is linked. `registration` (the default)
   * starts closed behind Add organization; once open, the name is required until Detach
   * closes the section.
   */
  variant?: 'registration' | 'settings'
  /** Settings only — Detach cleared the linked organization, so the form is dirty. */
  onDetached?: () => void
}

type FieldsProps = Pick<Props, 'disabled' | 'labelClassName'> & {
  onDetach: () => void
  /** Only when the provider opened the section — not when a saved organization opened it on load. */
  focusOnMount: boolean
  /** Empty is a valid "no organization". The name then carries no required mark. */
  optional?: boolean
}

const NAME_INPUT_ID = 'organization'

/**
 * The open section: the name search, a Detach button, and — once "add as new" is chosen —
 * the new organization's own fields.
 *
 * Its own component so registration's Detach can unmount it: the submit-first validation
 * state resets with it, and every item inside is `preserve={false}`, so the form forgets the
 * organization rather than submitting a stale one. Settings never unmounts it — Detach clears
 * the linked value in place, and the new-organization fields drop because `isNew` is gone.
 */
const OrganizationFields: FC<FieldsProps> = ({
  onDetach,
  focusOnMount,
  optional = false,
  disabled,
  labelClassName,
}) => {
  const t = useTranslations('Auth')
  const tValidation = useTranslations('Validation')
  const organization = Form.useWatch<OrganizationValue | undefined>('organization')
  const { validateTrigger, markChecked } = useValidateAfterSubmit()
  const searchRef = useRef<RefSelectProps>(null)
  const nameLabel = t('organization.name')
  /**
   * Settings: nothing to detach until an organization is linked, or a new one is being added
   * (that choice is what Detach cancels). Unresolved search text is not a link.
   */
  const showDetach = optional ? Boolean(organization?.id || organization?.isNew) : true

  // Opened by a click, the search is already where the user's attention is.
  useEffect(() => {
    if (focusOnMount) searchRef.current?.focus()
  }, [focusOnMount])

  const nameRules = useMemo<Rule[]>(
    () => [
      {
        validator: (_: unknown, value: OrganizationValue | undefined) => {
          markChecked()
          if (!value?.name?.trim()) {
            return optional
              ? Promise.resolve()
              : Promise.reject(new Error(tValidation('required', { label: nameLabel })))
          }
          if (value.id || value.isNew) return Promise.resolve()
          return Promise.reject(new Error(t('organization.chooseOrAdd')))
        },
      },
    ],
    [markChecked, nameLabel, optional, t, tValidation]
  )

  return (
    <div className='border-brand-border bg-surface-sunken rounded-brand flex flex-col gap-4 border p-4'>
      <div className='flex flex-col gap-1.5'>
        <div className='flex items-center justify-between gap-2'>
          <FieldLabel
            htmlFor={NAME_INPUT_ID}
            requirement={optional ? 'Optional' : 'Required'}
            className={labelClassName}
          >
            {nameLabel}
          </FieldLabel>
          {showDetach && (
            <AppButton type='text' size='small' icon={<DisconnectOutlined />} onClick={onDetach} disabled={disabled}>
              {t('organization.detach')}
            </AppButton>
          )}
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
 * Shared by provider registration (email and Google alike), becoming a provider, and the
 * settings profile. Renders its own named items (`organization`, `newOrganization.*`), so it
 * must not be placed inside a named `Form.Item`; `toOrganizationFields` turns them into the
 * payload. Closed, the items are unmounted and `validateFields()` omits them — which is how
 * registration's "no organization" reads. The settings profile never closes: an empty name
 * is that same reading, and Detach only clears a linked organization.
 */
export const OrganizationSection: FC<Props> = ({
  disabled,
  labelClassName,
  variant = 'registration',
  onDetached,
}) => {
  const t = useTranslations('Auth.organization')
  const form = Form.useFormInstance()
  const [ownOpen, setOwnOpen] = useState(false)
  const [openedByClick, setOpenedByClick] = useState(false)

  if (variant === 'settings') {
    return (
      <OrganizationFields
        optional
        focusOnMount={false}
        disabled={disabled}
        labelClassName={labelClassName}
        onDetach={() => {
          form.setFields([{ name: 'organization', value: undefined, errors: [] }])
          onDetached?.()
        }}
      />
    )
  }

  const setOpen = (next: boolean) => {
    setOwnOpen(next)
    setOpenedByClick(next)
  }

  if (!ownOpen) {
    return (
      <AppButton type='dashed' block icon={<PlusOutlined />} onClick={() => setOpen(true)} disabled={disabled}>
        {t('add')}
      </AppButton>
    )
  }

  return (
    <OrganizationFields
      onDetach={() => setOpen(false)}
      focusOnMount={openedByClick}
      disabled={disabled}
      labelClassName={labelClassName}
    />
  )
}
