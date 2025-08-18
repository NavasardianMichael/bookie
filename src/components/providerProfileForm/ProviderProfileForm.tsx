'use client'

import { Form } from 'antd'
import TextArea from 'antd/es/input/TextArea'
import { useFormik } from 'formik'
import { useProviderProfileStore } from '@store/providers/profile/store'
import { useFormItemRules } from '@hooks/useFormItemRules'
import { ProviderProfileFormValues } from '@interfaces/providers'
import { PROVIDER_PROFILE_FORM_INITIAL_VALUES } from '@constants/providers'
// import { useMultipleSelectRequiredRuleSet } from '@hooks/useMultipleSelectRequiredRuleSet'
import AppButton from '@components/ui/AppButton'
import AppInput from '@components/ui/AppInput'
import { processProviderProfileFormToPostPayload } from './processors'
import ProviderProfileFormCategories from './ProviderProfileFormCategories'
import ProviderProfileFormGallery from './ProviderProfileFormGallery'
import ProviderProfileImage from './ProviderProfileFormImage'
import ProviderProfileFormItem from './ProviderProfileFormItem'
import ProviderProfileLocationInput from './ProviderProfileFormLocation'
import ProviderProfileOrganization from './ProviderProfileFormOrganization'

import '@ant-design/v5-patch-for-react-19'

type Props = {
  initialValues?: ProviderProfileFormValues
}

const ProviderProfileForm: React.FC<Props> = ({ initialValues = PROVIDER_PROFILE_FORM_INITIAL_VALUES }) => {
  const putProviderProfileData = useProviderProfileStore.use.putProviderProfileData()
  const [form] = Form.useForm()

  const emailMaxCharsCountRuleSet = useFormItemRules('email', 'maxCharsForInput')
  const inputTextMaxCharsCountRuleSet = useFormItemRules('maxCharsForInput')
  const inputTextRequiredMaxCharsCountRuleSet = useFormItemRules('required', 'maxCharsForInput')
  const textareaMaxCharsCountRuleSet = useFormItemRules('maxCharsForTextarea')

  const formik = useFormik<typeof initialValues>({
    initialValues,
    validateOnChange: false,
    onSubmit: async (values) => {
      const payload = processProviderProfileFormToPostPayload(values)
      await putProviderProfileData(payload)
    },
  })

  return (
    <Form
      form={form}
      requiredMark={true}
      className='w-full flex flex-col'
      layout='vertical'
      validateTrigger='onSubmit'
      onFinish={formik.handleSubmit}
      scrollToFirstError
    >
      <ProviderProfileFormItem name='firstName' label='First Name' rules={inputTextRequiredMaxCharsCountRuleSet}>
        <AppInput
          name='firstName'
          value={formik.values.firstName}
          onChange={formik.handleChange}
          disabled={formik.isSubmitting}
          size='large'
        />
      </ProviderProfileFormItem>

      <ProviderProfileFormItem name='lastName' label='Last Name' rules={inputTextRequiredMaxCharsCountRuleSet}>
        <AppInput
          name='lastName'
          value={formik.values.lastName}
          onChange={formik.handleChange}
          disabled={formik.isSubmitting}
          size='large'
        />
      </ProviderProfileFormItem>

      <ProviderProfileFormItem
        name='categoryIds'
        label='Categories'
        rules={[
          {
            required: true,
            type: 'array',
            min: 1,
            message: 'Please select at least one category',
          },
          // {
          //   type: 'array',
          //   min: 1,
          //   message: 'Please select at least one category',
          // },
        ]}
      >
        <ProviderProfileFormCategories form={form} formik={formik} />
      </ProviderProfileFormItem>

      <ProviderProfileLocationInput formik={formik} disabled={formik.isSubmitting} />

      <ProviderProfileFormItem name='organization' label='Organization' rules={inputTextMaxCharsCountRuleSet}>
        <ProviderProfileOrganization formik={formik} />
      </ProviderProfileFormItem>

      <ProviderProfileFormItem name='email' label='Email' rules={emailMaxCharsCountRuleSet}>
        <AppInput
          name='email'
          value={formik.values.email}
          onChange={formik.handleChange}
          disabled={formik.isSubmitting}
          size='large'
        />
      </ProviderProfileFormItem>

      <ProviderProfileFormItem name='description' label='Notes' rules={textareaMaxCharsCountRuleSet}>
        <TextArea
          name='description'
          value={formik.values.description}
          onChange={formik.handleChange}
          disabled={formik.isSubmitting}
          size='large'
          autoSize={{ minRows: 3, maxRows: 5 }}
        />
      </ProviderProfileFormItem>

      <ProviderProfileFormItem name='image' label='Image'>
        <ProviderProfileImage formik={formik} />
      </ProviderProfileFormItem>

      <ProviderProfileFormItem name='gallery' label='Gallery'>
        <ProviderProfileFormGallery formik={formik} />
      </ProviderProfileFormItem>

      <AppButton
        type='primary'
        variant='solid'
        htmlType='submit'
        className='w-full h-[56px]!'
        loading={formik.isSubmitting}
      >
        Proceed to Services
      </AppButton>
    </Form>
  )
}

export default ProviderProfileForm
