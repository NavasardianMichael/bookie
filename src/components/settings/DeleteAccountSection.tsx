'use client'

import { FC, useState } from 'react'
import { DeleteOutlined } from '@ant-design/icons'
import { PasswordField } from '@app/[lang]/auth/components/PasswordField'
import { Form } from 'antd'
import { useTranslations } from 'next-intl'
import { deleteAccountAPI } from '@api/auth/main'
import { useAuthStore } from '@store/auth/store'
import { useFormItemRules } from '@hooks/useFormItemRules'
import { useRouter } from '@i18n/navigation'
import { AUTH_ERROR_CODES } from '@constants/auth'
import { ROUTES } from '@constants/routes'
import { isFormValidationError, processError, UserFacingError } from '@helpers/error'
import { AppButton } from '@components/ui/AppButton'
import { AppConfirmModal } from '@components/ui/AppConfirmModal'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { AppTitle } from '@components/ui/bare/AppTitle'
import { Surface } from '@components/ui/layout/Surface'

type Props = {
  disabled?: boolean
}

type ConfirmValues = {
  password: string
}

/**
 * Danger zone at the end of both Profile tabs. The listing trash icon on the
 * provider hero deletes the *public page* (`DELETE /provider-profile`); this
 * deletes the User (`DELETE /identity/account`) and everything that cascades
 * from it. The API re-asks for the password so a stolen session is not enough.
 */
export const DeleteAccountSection: FC<Props> = ({ disabled }) => {
  const t = useTranslations('Settings')
  const { push } = useRouter()
  const logout = useAuthStore.use.logout()
  const [form] = Form.useForm<ConfirmValues>()
  const [open, setOpen] = useState(false)
  const passwordRules = useFormItemRules('required')

  // AppConfirmModal awaits this, surfaces a rejection and keeps the dialog open.
  const onConfirm = async () => {
    let values: ConfirmValues
    try {
      values = await form.validateFields()
    } catch (err) {
      // A failed rule is already shown under the password field; anything else is not.
      if (isFormValidationError(err)) return
      throw err
    }

    try {
      await deleteAccountAPI({ password: values.password })
    } catch (err) {
      const appError = processError(err)
      if (appError.code === AUTH_ERROR_CODES.googleOnlyAccount) {
        throw new UserFacingError(t('deleteAccount.googleOnly'), { cause: err })
      }
      if (appError.code === AUTH_ERROR_CODES.hasAppointments) {
        throw new UserFacingError(t('deleteAccount.hasAppointments'), { cause: err })
      }
      if (appError.code === AUTH_ERROR_CODES.reauthRequired) {
        throw new UserFacingError(t('deleteAccount.wrongPassword'), { cause: err })
      }
      throw err
    }

    // Cookie is already cleared by the API. `logout` still resets the store;
    // its POST may 401 and the axios interceptor leaves that through.
    await logout()
    push(ROUTES.home)
  }

  return (
    <>
      <Surface className='flex flex-col gap-6'>
        <div className='flex flex-col gap-1.5'>
          <AppTitle level='h2' size='h3'>
            {t('deleteAccount.title')}
          </AppTitle>
          <AppParagraph size='body-sm'>{t('deleteAccount.hint')}</AppParagraph>
        </div>
        <AppButton
          danger
          icon={<DeleteOutlined />}
          disabled={disabled}
          type='primary'
          className='self-start'
          onClick={() => setOpen(true)}
        >
          {t('deleteAccount.button')}
        </AppButton>
      </Surface>
      <AppConfirmModal
        tone='danger'
        title={t('deleteAccount.confirmTitle')}
        description={t('deleteAccount.confirmBody')}
        okText={t('deleteAccount.button')}
        open={open}
        onConfirm={onConfirm}
        onCancel={() => {
          setOpen(false)
          form.resetFields()
        }}
      >
        <Form form={form} layout='vertical' requiredMark={false} onFinish={() => undefined}>
          <PasswordField
            name='password'
            label={t('deleteAccount.password')}
            autoComplete='current-password'
            rules={passwordRules}
            requirement='Required'
          />
        </Form>
      </AppConfirmModal>
    </>
  )
}
