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
      height='92dvh'
      className={className}
      destroyOnHidden
    >
      {children}
    </Drawer>
  )
}
