'use client'

import { FC, PropsWithChildren, ReactNode, useCallback, useState } from 'react'
import { App, Modal, ModalProps } from 'antd'
import { useTranslations } from 'next-intl'
import { cn } from '@helpers/cn'
import { processError } from '@helpers/error'
import { AppParagraph } from './bare/AppParagraph'
import { AppTitle } from './bare/AppTitle'
import { AlertTriangleIcon, HelpIcon } from './icons'

export type AppConfirmModalTone = 'default' | 'danger'

/**
 * Every antd `Modal` prop is accepted and forwarded, except the three this
 * component owns:
 *
 * - `onOk` → `onConfirm`, which may return a promise and drives the busy state.
 * - `footer` → the Confirm / Cancel pair *is* the component; a caller needing a
 *   different footer wants `AppSheet` or a bare `Modal`.
 * - `title` → narrowed to required, because a confirmation with no question is
 *   a dialog the user cannot answer.
 */
export type AppConfirmModalProps = PropsWithChildren<
  Omit<ModalProps, 'onOk' | 'footer' | 'title'> & {
    title: ReactNode
    /** The consequence, in one sentence. Rendered above `children`. */
    description?: ReactNode
    /** `danger` reddens the badge and the confirm button. */
    tone?: AppConfirmModalTone
    /** Overrides the tone's badge glyph; `null` drops the badge entirely. */
    icon?: ReactNode | null
    /** Awaited — the modal shows a busy state and blocks dismissal until it settles. */
    onConfirm: () => void | Promise<void>
    /** Required: without it the dialog has no way to close. */
    onCancel: NonNullable<ModalProps['onCancel']>
  }
>

const TONE_BADGE: Record<AppConfirmModalTone, string> = {
  default: 'bg-brand-100 text-brand',
  danger: 'bg-brand-danger/10 text-brand-danger',
}

const TONE_ICON: Record<AppConfirmModalTone, ReactNode> = {
  default: <HelpIcon className='h-5 w-5' />,
  danger: <AlertTriangleIcon className='h-5 w-5' />,
}

/**
 * The app's one confirmation dialog: badge, question, consequence, Confirm /
 * Cancel — on antd's `Modal`, so the focus trap, scroll lock and Esc handling
 * are antd's rather than ours.
 *
 * It is narrower than `AppSheet` (30rem, not 40rem) and stays a centred modal on
 * every viewport: a destructive question is short enough to fit above the fold
 * on a phone, and a bottom drawer would put the confirm button under the thumb
 * that just opened it.
 *
 * While `onConfirm` is in flight every dismissal route is closed — close button,
 * mask, Esc and Cancel — so a slow request cannot be abandoned into a state
 * where the user does not know whether it landed.
 */
export const AppConfirmModal: FC<AppConfirmModalProps> = ({
  title,
  description,
  tone = 'default',
  icon,
  onConfirm,
  onCancel,
  children,
  className,
  cancelButtonProps,
  cancelText,
  centered = true,
  closable,
  confirmLoading,
  keyboard,
  mask,
  okButtonProps,
  okText,
  width = 'min(30rem, 100%)',
  ...props
}) => {
  const t = useTranslations('Common')
  const { message } = App.useApp()
  const [pending, setPending] = useState(false)

  const busy = pending || !!confirmLoading

  const handleConfirm = useCallback(async () => {
    setPending(true)
    try {
      await onConfirm()
    } catch (error) {
      // The dialog deliberately stays open on failure: closing it would leave the
      // user unable to tell whether the action took effect.
      message.error(processError(error).message)
    } finally {
      setPending(false)
    }
  }, [message, onConfirm])

  // antd's object forms, merged rather than replaced so a caller's own
  // `closable` / `mask` config survives the busy-state lock.
  const closableOverrides = typeof closable === 'object' && closable !== null ? closable : undefined
  const resolvedClosable: ModalProps['closable'] =
    closable === false || closable === null
      ? closable
      : { 'aria-label': t('close'), ...closableOverrides, disabled: busy || !!closableOverrides?.disabled }

  const maskOverrides = typeof mask === 'boolean' ? { enabled: mask } : mask
  const resolvedMask: ModalProps['mask'] = { ...maskOverrides, closable: busy ? false : maskOverrides?.closable }

  const badge = icon === null ? null : (icon ?? TONE_ICON[tone])

  return (
    <Modal
      title={
        <div className='flex items-start gap-3'>
          {badge && (
            <span
              className={cn('flex size-9 shrink-0 items-center justify-center rounded-full', TONE_BADGE[tone])}
              aria-hidden='true'
            >
              {badge}
            </span>
          )}
          <AppTitle level='h2' size='h3' className='py-1.5'>
            {title}
          </AppTitle>
        </div>
      }
      onOk={() => void handleConfirm()}
      onCancel={onCancel}
      okText={okText ?? t('confirm')}
      cancelText={cancelText ?? t('cancel')}
      okButtonProps={{ danger: tone === 'danger', ...okButtonProps }}
      cancelButtonProps={{ ...cancelButtonProps, disabled: busy || !!cancelButtonProps?.disabled }}
      confirmLoading={busy}
      closable={resolvedClosable}
      mask={resolvedMask}
      keyboard={busy ? false : keyboard}
      centered={centered}
      width={width}
      className={cn(className)}
      destroyOnHidden
      {...props}
    >
      <div className='flex flex-col gap-3'>
        {description && <AppParagraph size='body-sm'>{description}</AppParagraph>}
        {children}
      </div>
    </Modal>
  )
}
