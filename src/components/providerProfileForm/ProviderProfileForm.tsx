'use client'

import { Col, Form, Input, Row } from 'antd'
import { useFormik } from 'formik'
import { useProviderProfileStore } from '@store/providers/profile/store'
import { useFormItemRules } from '@hooks/useFormItemRules'
import { ProviderProfileFormValues } from '@interfaces/providers'
import { useRouter } from '@i18n/navigation'
import { PROVIDER_PROFILE_FORM_INITIAL_VALUES } from '@constants/providers'
import { ROUTES } from '@constants/routes'
import { AppButton } from '@components/ui/AppButton'
import { AppFormItem } from '@components/ui/AppFormItem'
import { AppFormSection } from '@components/ui/AppFormSection'
import { AppInput } from '@components/ui/AppInput'
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

export const ProviderProfileForm: React.FC<Props> = ({ initialValues = PROVIDER_PROFILE_FORM_INITIAL_VALUES }) => {
  const { push } = useRouter()
  const putProviderProfileData = useProviderProfileStore.use.putProviderProfileData()
  const [form] = Form.useForm()

  const emailMaxCharsCountRuleSet = useFormItemRules('email', 'maxCharsForInput')
  const inputTextMaxCharsCountRuleSet = useFormItemRules('maxCharsForInput')
  const inputTextRequiredMaxCharsCountRuleSet = useFormItemRules('required', 'maxCharsForInput')
  const textareaMaxCharsCountRuleSet = useFormItemRules('maxCharsForTextarea')
  const oneItemSelectedAtLeastRuleSet = useFormItemRules('required', 'oneItemSelectedAtLeast')

  const formik = useFormik<typeof initialValues>({
    initialValues,
    validateOnChange: false,
    onSubmit: async (values) => {
      const payload = processProviderProfileFormToPostPayload(values)
      await putProviderProfileData(payload)
      push(ROUTES.providerServices)
    },
  })

  return (
    <Form
      form={form}
      requiredMark={true}
      className='relative flex w-full flex-col gap-6 pb-24 md:pb-0'
      layout='vertical'
      validateTrigger='onSubmit'
      onFinish={formik.handleSubmit}
      scrollToFirstError
    >
      <AppFormSection title='About you'>
        <Row gutter={[16, 0]}>
          <Col xs={24} md={12}>
            <AppFormItem name='firstName' label='First Name' rules={inputTextRequiredMaxCharsCountRuleSet}>
              <AppInput
                name='firstName'
                value={formik.values.firstName}
                onChange={formik.handleChange}
                disabled={formik.isSubmitting}
                autoComplete='given-name'
                enterKeyHint='next'
              />
            </AppFormItem>
          </Col>
          <Col xs={24} md={12}>
            <AppFormItem name='lastName' label='Last Name' rules={inputTextRequiredMaxCharsCountRuleSet}>
              <AppInput
                name='lastName'
                value={formik.values.lastName}
                onChange={formik.handleChange}
                disabled={formik.isSubmitting}
                autoComplete='family-name'
                enterKeyHint='next'
              />
            </AppFormItem>
          </Col>
        </Row>
      </AppFormSection>

      <AppFormSection title='What you do'>
        <AppFormItem name='categoryIds' label='Categories' rules={oneItemSelectedAtLeastRuleSet}>
          <ProviderProfileFormCategories form={form} formik={formik} />
        </AppFormItem>
      </AppFormSection>

      <AppFormSection title='Where'>
        <ProviderProfileLocationInput formik={formik} disabled={formik.isSubmitting} />
      </AppFormSection>

      <AppFormSection title='When you work'>
        <ProviderProfileWeekSchedule formik={formik} />
      </AppFormSection>

      <AppFormSection title='Optional'>
        <Row gutter={[16, 0]}>
          <Col xs={24} md={12}>
            <AppFormItem name='email' label='Email' rules={emailMaxCharsCountRuleSet}>
              <AppInput
                name='email'
                type='email'
                value={formik.values.email}
                onChange={formik.handleChange}
                disabled={formik.isSubmitting}
                autoComplete='email'
                inputMode='email'
                enterKeyHint='next'
              />
            </AppFormItem>
          </Col>
          <Col xs={24} md={12}>
            <AppFormItem name='organization' label='Organization' rules={inputTextMaxCharsCountRuleSet}>
              <ProviderProfileOrganization formik={formik} />
            </AppFormItem>
          </Col>
        </Row>

        <AppFormItem name='description' label='Notes' rules={textareaMaxCharsCountRuleSet}>
          <Input.TextArea
            name='description'
            value={formik.values.description}
            onChange={formik.handleChange}
            disabled={formik.isSubmitting}
            autoSize={{ minRows: 3, maxRows: 5 }}
          />
        </AppFormItem>

        <AppFormItem name='image' label='Image'>
          <ProviderProfileImage formik={formik} />
        </AppFormItem>

        <AppFormItem name='gallery' label='Gallery'>
          <ProviderProfileFormGallery formik={formik} />
        </AppFormItem>
      </AppFormSection>

      <div className='app-safe-b border-brand-border bg-surface sticky bottom-0 z-10 -mx-4 border-t px-4 py-3 md:static md:mx-0 md:border-0 md:bg-transparent md:p-0'>
        <AppButton type='primary' variant='solid' htmlType='submit' className='w-full' loading={formik.isSubmitting}>
          Proceed to Services
        </AppButton>
      </div>
    </Form>
  )
}
