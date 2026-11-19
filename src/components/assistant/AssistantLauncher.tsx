'use client'

import { FC, useCallback, useRef, useState } from 'react'
import { CloseOutlined, MessageOutlined } from '@ant-design/icons'
import { Spin, Tooltip } from 'antd'
import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'
import { useAssistantPanelStore } from '@store/assistant/panel/store'
import { useAuthStore } from '@store/auth/store'
import { useAssistantLauncherShown } from '@hooks/useAssistantLauncherShown'
import { useRouter } from '@i18n/navigation'
import { cn } from '@helpers/cn'

/**
 * Loaded on the first open: the chat pulls in photo import, the proposal cards and their dialogs,
 * and the launcher is on every page a provider opens — most of which never open it.
 */
const AssistantPanel = dynamic(() => import('./AssistantPanel').then((mod) => mod.AssistantPanel), {
  loading: () => (
    <div className='bg-surface md:border-brand-border fixed inset-0 z-50 flex items-center justify-center md:inset-auto md:end-4 md:bottom-24 md:h-40 md:w-[min(26rem,calc(100vw-2rem))] md:rounded-brand md:border md:shadow-xl'>
      <Spin />
    </div>
  ),
})

const PANEL_ID = 'assistant-panel'

/**
 * The provider's AI assistant, as chat widgets usually sit: a round button in the bottom
 * end corner of every page that opens the chat above it, and closes it again. Mounted once in
 * the app shell (`App.tsx`); shown only to a signed-in provider — every plan, so a plan without
 * it sees what unlocks it. On a phone the open chat fills the screen and closes from its header,
 * so the button steps aside.
 *
 * After an apply it bumps `useAssistantPanelStore.revision` (a settings tab or the bookings list
 * keyed on it re-reads), refreshes the session (name, clock in the header), and re-renders the
 * page's Server Components.
 */
export const AssistantLauncher: FC = () => {
  const t = useTranslations('Assistant')
  const tCommon = useTranslations('Common')
  const shown = useAssistantLauncherShown()
  const open = useAssistantPanelStore.use.open()
  const expanded = useAssistantPanelStore.use.expanded()
  const setPanelState = useAssistantPanelStore.use.setAssistantPanelState()
  const markApplied = useAssistantPanelStore.use.markApplied()
  const getMe = useAuthStore.use.getMe()
  const router = useRouter()
  const [opened, setOpened] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const close = useCallback((): void => {
    setPanelState({ open: false })
    buttonRef.current?.focus()
  }, [setPanelState])

  const toggle = (): void => {
    if (open) {
      close()
      return
    }
    setOpened(true)
    setPanelState({ open: true })
  }

  const handleApplied = useCallback((): void => {
    markApplied()
    void getMe()
    router.refresh()
  }, [getMe, markApplied, router])

  if (!shown) return null

  const label = open ? tCommon('close') : t('button')

  return (
    <>
      {opened && <AssistantPanel id={PANEL_ID} open={open} onClose={close} onApplied={handleApplied} />}
      <Tooltip title={label} placement='left'>
      <button
        ref={buttonRef}
        type='button'
        onClick={toggle}
        aria-expanded={open}
        aria-controls={opened ? PANEL_ID : undefined}
        aria-label={label}
        className={cn(
          // Above the home indicator on a notched phone: the safe area moves the button, not its icon.
          'bg-brand hover:bg-brand-hover fixed end-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-50 flex size-14 cursor-pointer items-center justify-center rounded-full border-0 text-2xl text-white shadow-xl transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2',
          // The open chat covers the button on a phone, and the expanded one on a desktop.
          open && (expanded ? 'hidden' : 'max-md:hidden')
        )}
      >
        {open ? <CloseOutlined aria-hidden /> : <MessageOutlined aria-hidden />}
      </button>
      </Tooltip>
    </>
  )
}
