'use client'

import { FC, useMemo } from 'react'
import { Form } from 'antd'
import type { Rule } from 'antd/es/form'
import type { CountryCode } from 'libphonenumber-js'
import { useTranslations } from 'next-intl'
import { useFormItemRules } from '@hooks/useFormItemRules'
import { useValidateAfterSubmit } from '@hooks/useValidateAfterSubmit'
import { MAX_CHARS_FOR_ADDRESS, MAX_CHARS_FOR_TEXTAREA, MAX_CHARS_FOR_WEBSITE } from '@constants/form'
import { toWebsiteUrl } from '@helpers/url'
import { AppFormItem } from '@components/ui/AppFormItem'
import { AppTextArea } from '@components/ui/AppTextArea'
import { AppText } from '@components/ui/bare/AppText'
import { GlobeIcon, MapPinIcon } from '@components/ui/icons'
import { FieldLabel } from './FieldLabel'
import { PhoneFieldNames, PhoneNumberField } from './PhoneNumberField'
import { RegistrationField } from './RegistrationField'

type Props = {
  disabled?: boolean
  labelClassName?: string
}

const DESCRIPTION_INPUT_ID = 'newOrganization-description'
const PHONE_INPUT_ID = 'newOrganization-phone'

const PHONE_NAMES: PhoneFieldNames = {
  code: ['newOrganization', 'phoneCode'],
  number: ['newOrganization', 'phoneNumber'],
}

const iconClassName = 'text-brand-muted h-4 w-4'

/**
 * The rest of a new organization, revealed once the provider chooses to add one: what its
 * public page shows beside the name. Every field is optional — a name is enough to create it,
 * and the provider can finish the page later — so none of them may block registration. No
 * email: an organization is reached through its providers, and nothing would verify it.
 *
 * The phone is the same country picker + number as the provider's, preselecting the
 * provider's country — which is also the one the organization takes. There is no country
 * field of its own; that is how `Organization.country` has always been filled.
 *
 * Phone and website check on submit rather than per keystroke (`useValidateAfterSubmit`).
 * Every item is `preserve={false}`, so choosing an existing organization instead, or
 * detaching, drops what was typed here.
 *
 * Renders its own named items, so it must not sit inside a named `Form.Item`.
 */
export const NewOrganizationFields: FC<Props> = ({ disabled, labelClassName }) => {
  const t = useTranslations('Auth')
  const tCommon = useTranslations('Common')
  const tValidation = useTranslations('Validation')
  const providerCountry = Form.useWatch<CountryCode | undefined>('code')
  const { validateTrigger: websiteTrigger, markChecked: markWebsiteChecked } = useValidateAfterSubmit()
  const descriptionRules = useFormItemRules('maxCharsForTextarea')
  const descriptionLabel = t('organization.description')

  const addressRules = useMemo<Rule[]>(
    () => [{ max: MAX_CHARS_FOR_ADDRESS, message: tValidation('maxCharsForInput', { max: MAX_CHARS_FOR_ADDRESS }) }],
    [tValidation]
  )

  const websiteRules = useMemo<Rule[]>(
    () => [
      {
        validator: (_: unknown, value: string | undefined) => {
          markWebsiteChecked()
          if (!value?.trim() || toWebsiteUrl(value)) return Promise.resolve()
          return Promise.reject(new Error(tValidation('url')))
        },
      },
    ],
    [markWebsiteChecked, tValidation]
  )

  return (
    <>
      <AppText size='caption' tone='muted'>
        {t('organization.newDetails')}
      </AppText>

      <div className='flex flex-col gap-1.5'>
        <FieldLabel htmlFor={DESCRIPTION_INPUT_ID} requirement='Optional' className={labelClassName}>
          {descriptionLabel}
        </FieldLabel>
        <AppFormItem
          name={['newOrganization', 'description']}
          rules={descriptionRules}
          messageVariables={{ label: descriptionLabel }}
          preserve={false}
        >
          <AppTextArea
            id={DESCRIPTION_INPUT_ID}
            rows={3}
            maxLength={MAX_CHARS_FOR_TEXTAREA}
            placeholder={t('organization.descriptionPlaceholder')}
            disabled={disabled}
          />
        </AppFormItem>
      </div>

      <RegistrationField
        name={['newOrganization', 'address']}
        label={tCommon('address')}
        requirement='Optional'
        placeholder={t('organization.addressPlaceholder')}
        icon={<MapPinIcon className={iconClassName} />}
        rules={addressRules}
        maxLength={MAX_CHARS_FOR_ADDRESS}
        disabled={disabled}
        preserve={false}
        labelClassName={labelClassName}
      />

      <PhoneNumberField
        label={tCommon('phone')}
        requirement='Optional'
        required={false}
        names={PHONE_NAMES}
        inputId={PHONE_INPUT_ID}
        defaultCountry={providerCountry}
        preserve={false}
        disabled={disabled}
        labelClassName={labelClassName}
      />

      <RegistrationField
        name={['newOrganization', 'website']}
        inputMode='url'
        label={tCommon('website')}
        requirement='Optional'
        placeholder={t('organization.websitePlaceholder')}
        icon={<GlobeIcon className={iconClassName} />}
        rules={websiteRules}
        validateTrigger={websiteTrigger}
        maxLength={MAX_CHARS_FOR_WEBSITE}
        disabled={disabled}
        preserve={false}
        labelClassName={labelClassName}
      />
    </>
  )
}
