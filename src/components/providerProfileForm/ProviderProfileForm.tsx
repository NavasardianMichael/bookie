'use client'

import { useCallback } from 'react'
import { Form } from 'antd'
import TextArea from 'antd/es/input/TextArea'
import { useFormik } from 'formik'
import { useRouter } from 'next/navigation'
import { useProviderProfileStore } from '@store/providers/profile/store'
import { useFormItemRules } from '@hooks/useFormItemRules'
import { ProviderProfileFormValues } from '@interfaces/providers'
import { PROVIDER_PROFILE_FORM_INITIAL_VALUES } from '@constants/providers'
import { ROUTES } from '@constants/routes'
import AppButton from '@components/ui/AppButton'
import AppProfileFormItem from '@components/ui/AppFormItem'
import AppInput from '@components/ui/AppInput'
import { processProviderProfileFormToPostPayload } from './processors'
import ProviderProfileFormCategories from './ProviderProfileFormCategories'
import ProviderProfileFormGallery from './ProviderProfileFormGallery'
import ProviderProfileImage from './ProviderProfileFormImage'
import ProviderProfileLocationInput from './ProviderProfileFormLocation'
import ProviderProfileOrganization from './ProviderProfileFormOrganization'
import ProviderProfileWeekSchedule from './ProviderProfileWeekSchedule'

import '@ant-design/v5-patch-for-react-19'

type Props = {
  initialValues?: ProviderProfileFormValues
}

const ProviderProfileForm: React.FC<Props> = ({ initialValues = PROVIDER_PROFILE_FORM_INITIAL_VALUES }) => {
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
      push(ROUTES.providerProfileServices)
    },
  })

  const onSubmitButtonClick: React.MouseEventHandler<HTMLButtonElement> = useCallback(() => {
    if (form.getFieldError('firstName').length || form.getFieldError('lastName').length) return
    if (form.getFieldError('categoryIds').length) form.scrollToField('lastName')
  }, [form])

  return (
    <Form
      form={form}
      requiredMark={true}
      className={`w-full flex flex-col gap-4`}
      layout='vertical'
      validateTrigger='onSubmit'
      onFinish={formik.handleSubmit}
      scrollToFirstError
    >
      <AppProfileFormItem name='firstName' label='First Name' rules={inputTextRequiredMaxCharsCountRuleSet}>
        <AppInput
          name='firstName'
          value={formik.values.firstName}
          onChange={formik.handleChange}
          disabled={formik.isSubmitting}
          size='large'
        />
      </AppProfileFormItem>

      <AppProfileFormItem name='lastName' label='Last Name' rules={inputTextRequiredMaxCharsCountRuleSet}>
        <AppInput
          name='lastName'
          value={formik.values.lastName}
          onChange={formik.handleChange}
          disabled={formik.isSubmitting}
          size='large'
        />
      </AppProfileFormItem>

      <AppProfileFormItem name='categoryIds' label='Categories' rules={oneItemSelectedAtLeastRuleSet}>
        <ProviderProfileFormCategories form={form} formik={formik} />
      </AppProfileFormItem>

      <ProviderProfileLocationInput formik={formik} disabled={formik.isSubmitting} />

      <ProviderProfileWeekSchedule formik={formik} />

      <AppProfileFormItem name='organization' label='Organization' rules={inputTextMaxCharsCountRuleSet}>
        <ProviderProfileOrganization formik={formik} />
      </AppProfileFormItem>

      <AppProfileFormItem name='email' label='Email' rules={emailMaxCharsCountRuleSet}>
        <AppInput
          name='email'
          value={formik.values.email}
          onChange={formik.handleChange}
          disabled={formik.isSubmitting}
          size='large'
        />
      </AppProfileFormItem>

      <AppProfileFormItem name='description' label='Notes' rules={textareaMaxCharsCountRuleSet}>
        <TextArea
          name='description'
          value={formik.values.description}
          onChange={formik.handleChange}
          disabled={formik.isSubmitting}
          size='large'
          autoSize={{ minRows: 3, maxRows: 5 }}
        />
      </AppProfileFormItem>

      <AppProfileFormItem name='image' label='Image'>
        <ProviderProfileImage formik={formik} />
      </AppProfileFormItem>

      <AppProfileFormItem name='gallery' label='Gallery'>
        <ProviderProfileFormGallery formik={formik} />
      </AppProfileFormItem>

      <AppButton
        type='primary'
        variant='solid'
        htmlType='submit'
        className='w-full h-[56px]!'
        loading={formik.isSubmitting}
        onClick={onSubmitButtonClick}
      >
        Proceed to Services
      </AppButton>
    </Form>
  )
}

export default ProviderProfileForm
