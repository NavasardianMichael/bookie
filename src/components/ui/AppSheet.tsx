'use client'

import { FC, PropsWithChildren, ReactNode } from 'react'
import { Drawer, Grid, Modal } from 'antd'

export type AppSheetProps = PropsWithChildren<{
  open: boolean
  onClose: () => void
  title?: ReactNode
  className?: string
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
export const AppSheet: FC<AppSheetProps> = ({ open, onClose, title, className, children }) => {
  const screens = Grid.useBreakpoint()
  const isDesktop = !!screens.md

  if (isDesktop) {
    return (
      <Modal
        title={title}
        open={open}
        onCancel={onClose}
        footer={null}
        width='min(40rem, 100%)'
        centered
        className={className}
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
      onClose={onClose}
      placement='bottom'
      size='92dvh'
      className={className}
      styles={{ body: { overflowY: 'auto' } }}
      destroyOnHidden
    >
      {children}
    </Drawer>
  )
}
