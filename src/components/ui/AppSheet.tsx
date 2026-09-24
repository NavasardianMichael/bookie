'use client'

import { FC, PropsWithChildren, ReactNode } from 'react'
import { Drawer, Grid, Modal } from 'antd'
import { useTranslations } from 'next-intl'

export type AppSheetProps = PropsWithChildren<{
  open: boolean
  onClose: () => void
  title?: ReactNode
  className?: string
  /**
   * Locks the close button, mask click, and Escape while a request inside the
   * sheet is in flight. Callers still disable their own actions; this only owns
   * the chrome. Same dismissal lock `AppConfirmModal` applies during `onConfirm`.
   */
  pending?: boolean
}>

/**
 * Modal on md+, bottom drawer on smaller screens. `footer={null}` — callers own
 * their actions so we never hide focusable footer buttons.
 *
 * The desktop body is capped (`80dvh`) so a long form — booking confirm with
 * guest fields, payment details and notes — scrolls inside the sheet instead of
 * growing with the page. The drawer already has a `92dvh` size; its body
 * scrolls the same way.
 */
export const AppSheet: FC<AppSheetProps> = ({ open, onClose, title, className, pending = false, children }) => {
  const screens = Grid.useBreakpoint()
  const isDesktop = !!screens.md
  const t = useTranslations('Common')

  const requestClose = () => {
    if (!pending) onClose()
  }

  const closable = { 'aria-label': t('close'), disabled: pending }

  if (isDesktop) {
    return (
      <Modal
        title={title}
        open={open}
        onCancel={requestClose}
        footer={null}
        width='min(40rem, 100%)'
        centered
        className={className}
        closable={closable}
        mask={{ closable: !pending }}
        keyboard={!pending}
        styles={{ body: { maxHeight: '80dvh', overflowY: 'auto' } }}
        destroyOnHidden
      >
        {children}
      </Modal>
    )
  }

  return (
    <Drawer
      title={title}
      open={open}
      onClose={requestClose}
      placement='bottom'
      size='92dvh'
      className={className}
      closable={closable}
      mask={{ closable: !pending }}
      keyboard={!pending}
      styles={{ body: { overflowY: 'auto' } }}
      destroyOnHidden
    >
      {children}
    </Drawer>
  )
}
