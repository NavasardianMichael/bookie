'use client'

import { useState } from 'react'
import { Col, Form, Row } from 'antd'
import { useTranslations } from 'next-intl'
import { useProviderProfileStore } from '@store/providers/profile/store'
import { useFormItemRules } from '@hooks/useFormItemRules'
import { ProviderProfileFormValues } from '@interfaces/providers'
import { useRouter } from '@i18n/navigation'
import { MAX_CHARS_FOR_TEXTAREA } from '@constants/form'
import { PROVIDER_PROFILE_FORM_INITIAL_VALUES } from '@constants/providers'
import { ROUTES } from '@constants/routes'
import { processError } from '@helpers/error'
import { AppButton } from '@components/ui/AppButton'
import { AppFormItem } from '@components/ui/AppFormItem'
import { AppFormSection } from '@components/ui/AppFormSection'
import { AppInput } from '@components/ui/AppInput'
import { AppTextArea } from '@components/ui/AppTextArea'
import { processProviderProfileFormToPostPayload } from './processors'
import { ProviderProfileFormCategories } from './ProviderProfileFormCategories'
import { ProviderProfileFormGallery } from './ProviderProfileFormGallery'
import { ProviderProfileImage } from './ProviderProfileFormImage'
import { ProviderProfileLocationInput } from './ProviderProfileFormLocation'
import { ProviderProfileOrganization } from './ProviderProfileFormOrganization'
import { ProviderProfileWeekSchedule } from './ProviderProfileWeekSchedule'

type Props = {
  initialValues?: ProviderProfileFormValues
}

/**
 * Ant Design `Form` owns every value here.
 *
 * This form used to carry a Formik binding alongside antd, and the two disagreed by
 * construction: antd's store value wins the render, while `onFinish={formik.handleSubmit}`
 * ignored the values antd handed it. Two consequences were live — `categoryIds` carried
 * `required` + `min: 1` rules on a slot nothing ever wrote, so the form **could not be
 * submitted at all**, and the organization field wrote a key the payload builder never
 * read. Both are gone by construction now: one store, and every custom field implements
 * the `value`/`onChange` control contract. Do not reintroduce Formik.
 */
export const ProviderProfileForm: React.FC<Props> = ({ initialValues = PROVIDER_PROFILE_FORM_INITIAL_VALUES }) => {
  const t = useTranslations('ProfileCreation')
  const { push } = useRouter()
  const putProviderProfileData = useProviderProfileStore.use.putProviderProfileData()
  const [form] = Form.useForm<ProviderProfileFormValues>()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const emailMaxCharsCountRuleSet = useFormItemRules('email', 'maxCharsForInput')
  const inputTextMaxCharsCountRuleSet = useFormItemRules('maxCharsForInput')
  const inputTextRequiredMaxCharsCountRuleSet = useFormItemRules('required', 'maxCharsForInput')
  const textareaMaxCharsCountRuleSet = useFormItemRules('maxCharsForTextarea')
  const oneItemSelectedAtLeastRuleSet = useFormItemRules('required', 'oneItemSelectedAtLeast')

  /** `values` comes from antd, which is now the only place they live. */
  const handleFinish = async (values: ProviderProfileFormValues) => {
    setIsSubmitting(true)
    setError(null)
    try {
      await putProviderProfileData(processProviderProfileFormToPostPayload(values))
      push(ROUTES.providerServices)
    } catch (err) {
      setError(processError(err).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Form
      form={form}
      initialValues={initialValues}
      requiredMark
      className='relative flex w-full flex-col gap-6 pb-24 md:pb-0'
      layout='vertical'
      onFinish={handleFinish}
      scrollToFirstError
    >
      <AppFormSection title={t('aboutYou')}>
        <Row gutter={[16, 0]}>
          <Col xs={24} md={12}>
            <AppFormItem name='firstName' label={t('firstName')} rules={inputTextRequiredMaxCharsCountRuleSet}>
              <AppInput disabled={isSubmitting} autoComplete='given-name' enterKeyHint='next' />
            </AppFormItem>
          </Col>
          <Col xs={24} md={12}>
            <AppFormItem name='lastName' label={t('lastName')} rules={inputTextRequiredMaxCharsCountRuleSet}>
              <AppInput disabled={isSubmitting} autoComplete='family-name' enterKeyHint='next' />
            </AppFormItem>
          </Col>
        </Row>
      </AppFormSection>

      <AppFormSection title={t('whatYouDo')}>
        <AppFormItem name='categoryIds' label={t('categories')} rules={oneItemSelectedAtLeastRuleSet}>
          <ProviderProfileFormCategories disabled={isSubmitting} />
        </AppFormItem>
      </AppFormSection>

      <AppFormSection title={t('where')}>
        {/* Deliberately not wrapped in a named `Form.Item` — it renders its own. */}
        <ProviderProfileLocationInput disabled={isSubmitting} />
      </AppFormSection>

      <AppFormSection title={t('whenYouWork')}>
        <AppFormItem name='weekSchedule'>
          <ProviderProfileWeekSchedule />
        </AppFormItem>
      </AppFormSection>

      <AppFormSection title={t('optional')}>
        <Row gutter={[16, 0]}>
          <Col xs={24} md={12}>
            <AppFormItem name='email' label={t('email')} rules={emailMaxCharsCountRuleSet}>
              <AppInput
                type='email'
                disabled={isSubmitting}
                autoComplete='email'
                inputMode='email'
                enterKeyHint='next'
              />
            </AppFormItem>
          </Col>
          <Col xs={24} md={12}>
            {/* `organizationId`, not `organization` — the name has to match the values key
                the payload builder reads, or the selection is silently never submitted. */}
            <AppFormItem name='organizationId' label={t('organization')} rules={inputTextMaxCharsCountRuleSet}>
              <ProviderProfileOrganization disabled={isSubmitting} />
            </AppFormItem>
          </Col>
        </Row>

        <AppFormItem name='description' label={t('notes')} rules={textareaMaxCharsCountRuleSet}>
          <AppTextArea disabled={isSubmitting} autoSize={{ minRows: 3, maxRows: 5 }} maxLength={MAX_CHARS_FOR_TEXTAREA} />
        </AppFormItem>

        <AppFormItem name='image' label={t('image')}>
          <ProviderProfileImage disabled={isSubmitting} />
        </AppFormItem>

        <AppFormItem name='gallery' label={t('gallery')}>
          <ProviderProfileFormGallery disabled={isSubmitting} />
        </AppFormItem>
      </AppFormSection>

      {error && (
        <div role='alert' className='text-body-sm text-red-600'>
          {error}
        </div>
      )}

      <div className='app-safe-b border-brand-border bg-surface sticky bottom-0 z-10 -mx-4 border-t px-4 py-3 md:static md:mx-0 md:border-0 md:bg-transparent md:p-0'>
        <AppButton type='primary' variant='solid' htmlType='submit' className='w-full' loading={isSubmitting}>
          {t('proceed')}
        </AppButton>
      </div>
    </Form>
  )
}
