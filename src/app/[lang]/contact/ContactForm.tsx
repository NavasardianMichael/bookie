'use client'

import { useCallback, useEffect, useState } from 'react'
import { FieldLabel } from '@app/[lang]/auth/components/FieldLabel'
import { Form } from 'antd'
import type { Rule } from 'antd/es/form'
import { useTranslations } from 'next-intl'
import { postContactMessageAPI } from '@api/contact/main'
import { useAuthStore } from '@store/auth/store'
import { useFormItemRules } from '@hooks/useFormItemRules'
import { MAX_CHARS_FOR_CONTACT_MESSAGE } from '@constants/form'
import { AppButton } from '@components/ui/AppButton'
import { AppFormItem } from '@components/ui/AppFormItem'
import { AppInput } from '@components/ui/AppInput'
import { AppTextArea } from '@components/ui/AppTextArea'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { AppTitle } from '@components/ui/bare/AppTitle'
import { ErrorAlert } from '@components/ui/ErrorAlert'
import { CheckCircleIcon } from '@components/ui/icons'

type ContactFormValues = {
  firstName: string
  lastName: string
  email: string
  message: string
  /** Honeypot — see the hidden field at the bottom of the form. */
  website?: string
}

/** The keys prefill may write. `message` is never one of them. */
type PrefillableField = 'firstName' | 'lastName' | 'email'

export const ContactForm = () => {
  const t = useTranslations('Contact')
  const [form] = Form.useForm<ContactFormValues>()
  const isSignedOn = useAuthStore.use.isSignedOn()
  const firstName = useAuthStore.use.firstName()
  const lastName = useAuthStore.use.lastName()
  const email = useAuthStore.use.email()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [isSent, setIsSent] = useState(false)

  const nameRules = useFormItemRules('required', 'maxCharsForInput')
  const emailRules = useFormItemRules('required', 'email')

  /**
   * `useFormItemRules` composes named rules and cannot parameterise `max`, and
   * `maxCharsForTextarea` caps at 300 — too short for a support request. So this one is
   * written inline, which the forms skill sanctions for exactly this case.
   */
  const messageRules: Rule[] = [
    { required: true, message: t('validation.messageRequired') },
    {
      max: MAX_CHARS_FOR_CONTACT_MESSAGE,
      message: t('validation.messageTooLong', { max: MAX_CHARS_FOR_CONTACT_MESSAGE }),
    },
  ]

  /**
   * Fills only the fields the visitor has left empty, which is what makes it safe to run
   * whenever a source lands. Name and email both come from `getMe()`, and a visitor can
   * start typing before that request returns — overwriting what they wrote is the bug
   * this avoids. The address is the account's identity email, so a provider session and
   * a consumer session prefill the same way.
   */
  const applyPrefill = useCallback(() => {
    const values: Record<PrefillableField, string | undefined> = {
      firstName: firstName ?? undefined,
      lastName: lastName ?? undefined,
      email: email ?? undefined,
    }
    const current = form.getFieldsValue()
    const next = Object.entries(values).filter(([field, value]) => value && !current[field as PrefillableField])
    if (next.length) form.setFieldsValue(Object.fromEntries(next))
  }, [firstName, lastName, email, form])

  // Re-runs as each source lands, and after a reset. Safe because it only fills blanks.
  useEffect(() => {
    if (!isSignedOn) return
    applyPrefill()
  }, [isSignedOn, applyPrefill])

  const handleFinish = async (values: ContactFormValues) => {
    setIsSubmitting(true)
    setError(null)
    try {
      await postContactMessageAPI({
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email.trim(),
        message: values.message,
        website: values.website ?? '',
      })
      setIsSent(true)
    } catch (err) {
      // Kept on screen with the values intact — nothing is stored server-side, so a
      // failed send means the message exists only in this form and must not be cleared.
      setError(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSendAnother = () => {
    form.resetFields()
    setIsSent(false)
    setError(null)
    // `resetFields` clears the prefilled name and email too, so put them back rather than
    // making a signed-in visitor retype what the session already holds.
    applyPrefill()
  }

  if (isSent) {
    return (
      <div className='flex flex-col items-start gap-4'>
        <AppTitle level='h2' size='h3' className='flex items-center gap-2'>
          <CheckCircleIcon className='text-brand h-5 w-5' />
          {t('success.title')}
        </AppTitle>
        <AppParagraph>{t('success.body')}</AppParagraph>
        <AppButton type='default' onClick={handleSendAnother}>
          {t('success.sendAnother')}
        </AppButton>
      </div>
    )
  }

  return (
    <Form
      form={form}
      layout='vertical'
      requiredMark={false}
      onFinish={handleFinish}
      scrollToFirstError
      className='flex flex-col gap-4'
    >
      {error !== null && <ErrorAlert error={error} />}

      <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
        <div className='flex flex-col gap-1.5'>
          <FieldLabel htmlFor='contact-first-name' requirement='Required'>
            {t('fields.firstName')}
          </FieldLabel>
          <AppFormItem name='firstName' rules={nameRules} messageVariables={{ label: t('fields.firstName') }}>
            <AppInput id='contact-first-name' autoComplete='given-name' enterKeyHint='next' />
          </AppFormItem>
        </div>

        <div className='flex flex-col gap-1.5'>
          <FieldLabel htmlFor='contact-last-name' requirement='Required'>
            {t('fields.lastName')}
          </FieldLabel>
          <AppFormItem name='lastName' rules={nameRules} messageVariables={{ label: t('fields.lastName') }}>
            <AppInput id='contact-last-name' autoComplete='family-name' enterKeyHint='next' />
          </AppFormItem>
        </div>

        <div className='flex flex-col gap-1.5 md:col-span-2'>
          <FieldLabel htmlFor='contact-email' requirement='Required'>
            {t('fields.email')}
          </FieldLabel>
          <AppFormItem name='email' rules={emailRules} messageVariables={{ label: t('fields.email') }}>
            <AppInput id='contact-email' type='email' inputMode='email' autoComplete='email' />
          </AppFormItem>
        </div>

        <div className='flex flex-col gap-1.5 md:col-span-2'>
          <FieldLabel htmlFor='contact-message' requirement='Required'>
            {t('fields.message')}
          </FieldLabel>
          <AppFormItem name='message' rules={messageRules} messageVariables={{ label: t('fields.message') }}>
            <AppTextArea
              id='contact-message'
              rows={6}
              maxLength={MAX_CHARS_FOR_CONTACT_MESSAGE}
              placeholder={t('fields.messagePlaceholder')}
            />
          </AppFormItem>
        </div>
      </div>

      {/*
        Honeypot. Hidden from people and from assistive tech, but present in the DOM,
        which is the whole mechanism: a bot fills every field it can parse and the server
        drops any submission that has this one set. `noStyle` keeps antd's feedback
        machinery off an invisible field while still binding value/onChange to the input.
      */}
      <div className='hidden' aria-hidden='true'>
        <Form.Item name='website' noStyle>
          <input type='text' tabIndex={-1} autoComplete='off' />
        </Form.Item>
      </div>

      {/*
        `self-end`, not a physical right: the form is a flex column, so this aligns on the
        cross axis and follows `dir` — which puts it on the left in the Arabic build, where
        that *is* the trailing edge. A `ml-auto` or `text-right` would pin it to the right
        in all 16 locales and read as misplaced in RTL.
      */}
      <AppButton htmlType='submit' type='primary' loading={isSubmitting} className='self-end'>
        {t('actions.send')}
      </AppButton>
    </Form>
  )
}
