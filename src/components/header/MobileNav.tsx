'use client'

import { FC, useCallback, useState } from 'react'
import { MenuOutlined } from '@ant-design/icons'
import { Button, Drawer } from 'antd'
import { HEADER_CTA } from '@constants/header'
import { ROUTES } from '@constants/routes'
import AppButton from '@components/ui/AppButton'
import AppLink from '@components/ui/AppLink'
import NavLinks from './NavLinks'

type Props = {
  isActive: (route: string) => boolean
}

/**
 * Replaces a CSS checkbox-hack drawer.
 *
 * That approach could not do a focus trap, scroll lock, `aria-expanded`, or focus
 * restoration on close — each of which would have been hand-written here — and
 * its hamburger animation never fired, because Tailwind's `peer-*` compiles to a
 * sibling combinator while the icon bars were descendants of the label.
 * antd's Drawer provides all of it and is already in the bundle.
 */
const MobileNav: FC<Props> = ({ isActive }) => {
  const [open, setOpen] = useState(false)

  const close = useCallback(() => setOpen(false), [])
  const toggle = useCallback(() => setOpen((prev) => !prev), [])

  return (
    <>
      <Button
        type='text'
        className='min-h-11 min-w-11 md:hidden'
        aria-label='Open navigation menu'
        aria-expanded={open}
        aria-controls='mobile-nav'
        icon={<MenuOutlined />}
        onClick={toggle}
      />
      <Drawer
        id='mobile-nav'
        title='Menu'
        placement='right'
        open={open}
        onClose={close}
        // Never eats the whole screen at 320px, never looks cramped on a tablet.
        size='min(20rem, 85vw)'
        rootClassName='md:hidden'
        styles={{ body: { padding: 12, overscrollBehavior: 'contain' } }}
      >
        <div className='flex flex-col gap-4'>
          <NavLinks orientation='vertical' isActive={isActive} onNavigate={close} />
          <AppLink href={ROUTES.accountTypeSelection} className='no-underline' onClick={close}>
            <AppButton type='primary' className='w-full'>
              {HEADER_CTA.label}
            </AppButton>
          </AppLink>
        </div>
      </Drawer>
    </>
  )
}

export default MobileNav
