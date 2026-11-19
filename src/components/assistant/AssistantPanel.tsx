'use client'

import { FC, useEffect, useRef, useState } from 'react'
import {
  CloseOutlined,
  DeleteOutlined,
  ExpandAltOutlined,
  FormOutlined,
  RobotOutlined,
  ShrinkOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons'
import { App, Spin } from 'antd'
import { useLocale, useTranslations } from 'next-intl'
import { AssistantAction, AssistantMessage } from '@api/assistant/types'
import { useAssistantPanelStore } from '@store/assistant/panel/store'
import { useAuthStore } from '@store/auth/store'
import { useApplyAssistantProposal } from '@hooks/useApplyAssistantProposal'
import { useAssistantChat } from '@hooks/useAssistantChat'
import { AssistantScheduleImpact, useAssistantScheduleImpact } from '@hooks/useAssistantScheduleImpact'
import { useErrorToast } from '@hooks/useErrorToast'
import { ROUTES } from '@constants/routes'
import { proposalStatusFrom } from '@helpers/assistant'
import { cn } from '@helpers/cn'
import { UserFacingError } from '@helpers/error'
import { resolveTimeFormat } from '@helpers/timeFormat'
import { PhotoImportSheet } from '@components/bookingImport/PhotoImportSheet'
import { ScheduleImpactModal } from '@components/settings/ScheduleImpactModal'
import { AppButton } from '@components/ui/AppButton'
import { AppConfirmModal } from '@components/ui/AppConfirmModal'
import { AppLink } from '@components/ui/bare/AppLink'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { AppText } from '@components/ui/bare/AppText'
import { EmptyState } from '@components/ui/EmptyState'
import { ErrorAlert } from '@components/ui/ErrorAlert'
import { ErrorState } from '@components/ui/ErrorState'
import { AssistantComposer } from './AssistantComposer'
import { AssistantConversationList } from './AssistantConversationList'
import { AssistantMessageItem } from './AssistantMessageItem'
import { AssistantPhotoCard } from './AssistantPhotoCard'
import { AssistantProposalCard } from './AssistantProposalCard'

type Props = {
  id: string
  open: boolean
  onClose: () => void
  /** Something was applied — the page behind should read its data again. */
  onApplied: () => void
}

/** Example requests on an empty chat; a tap puts one in the box to edit. */
const EXAMPLES = ['closedTomorrow', 'vacation', 'newService', 'pending'] as const

/**
 * The provider's AI assistant: a chat that answers questions about their workspace and proposes
 * changes to it — hours, special dates, services, bookings, settings — each applied only when
 * the provider presses Apply on its card. The history is kept on the server for the provider;
 * the camera button reads a photo of a paper diary into bookings to review.
 *
 * A **non-modal** panel above the launcher (`AssistantLauncher`), as chat widgets are: the page
 * behind stays usable, so a provider can read their hours while asking to change them. Full
 * screen below `md`. It stays mounted once opened — hidden, not unmounted — so a reply still
 * streaming and a half-typed message survive closing it.
 *
 * Several chats (`AssistantConversation`): the newest opens, the list button (the side column
 * when expanded) switches, **New chat** starts an empty one that its first message stores, and
 * the bin deletes the open one.
 *
 * Standard plan and up, or the `assistantMessages` add-on (`assistantMessagesPerDay`); without
 * either the panel says what unlocks it.
 */
export const AssistantPanel: FC<Props> = ({ id, open, onClose, onApplied }) => {
  const t = useTranslations('Assistant')
  const tCommon = useTranslations('Common')
  const locale = useLocale()
  const { message } = App.useApp()
  const toast = useErrorToast()
  const storedTimeFormat = useAuthStore.use.timeFormat()
  const timeFormat = resolveTimeFormat(storedTimeFormat, locale)
  const chat = useAssistantChat(open)
  const apply = useApplyAssistantProposal()
  const checkImpact = useAssistantScheduleImpact()
  const [impactCheck, setImpactCheck] = useState<
    (AssistantScheduleImpact & { target: AssistantMessage; actions: AssistantAction[] }) | null
  >(null)
  const [photoOpen, setPhotoOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  /** The corner panel and the phone: the chat list in place of the conversation. */
  const [listOpen, setListOpen] = useState(false)
  const [applyingId, setApplyingId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  /** Desktop only: along the bottom of the page instead of the corner, for a long thread or a big proposal. */
  const expanded = useAssistantPanelStore.use.expanded()
  const setPanelState = useAssistantPanelStore.use.setAssistantPanelState()
  const panelRef = useRef<HTMLElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const state = chat.state
  const messages = chat.messages
  const ready = state !== null && state.included && state.available
  const spent = state?.usage.limit !== null && state !== null && state.usage.used >= (state.usage.limit ?? 0)

  // Focus moves into the panel as it opens, so a keyboard user lands in the chat.
  useEffect(() => {
    if (open) panelRef.current?.focus()
  }, [open])

  // Keep the newest turn in view as it grows. The panel's own scroller, never the page's.
  useEffect(() => {
    const scroller = scrollRef.current
    if (open && scroller) scroller.scrollTop = scroller.scrollHeight
  }, [open, chat.activeId, messages.length, chat.streaming])

  // Escape closes it while focus is inside — not from the page behind, which keeps its own keys,
  // nor from a dialog opened over it (portalled outside the panel), which closes first.
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: globalThis.KeyboardEvent): void => {
      if (event.key === 'Escape' && panelRef.current?.contains(event.target as Node)) onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose, open])

  const applyProposal = async (target: AssistantMessage, actions: AssistantAction[]): Promise<void> => {
    setApplyingId(target.id)
    try {
      const outcomes = await apply(actions)
      const status = proposalStatusFrom(outcomes)
      if (!status) {
        // Nothing went through: the proposal stays pending, to try again or adjust by hand.
        toast(new UserFacingError(t('applyFailed')))
        return
      }
      await chat.report({ id: target.id, status, outcome: outcomes })
      onApplied()
      if (status === 'applied') void message.success(t('applied'))
      else void message.warning(t('appliedPartly'))
    } catch (error) {
      toast(error, { title: t('applyFailed') })
    } finally {
      setApplyingId(null)
    }
  }

  /**
   * Apply, after saying what the proposal's hours would do to the services and bookings that
   * depend on them — as the Availability tab asks before Publish. Nothing is asked when nothing
   * is affected; a check that cannot read the bookings is shown and applies nothing.
   */
  const requestApply = async (target: AssistantMessage, actions: AssistantAction[]): Promise<void> => {
    let found: AssistantScheduleImpact | null
    try {
      found = await checkImpact(actions)
    } catch (error) {
      toast(error, { title: t('applyFailed') })
      return
    }
    if (found) setImpactCheck({ ...found, target, actions })
    else await applyProposal(target, actions)
  }

  const report = async (payload: Parameters<typeof chat.report>[0]): Promise<void> => {
    try {
      await chat.report(payload)
    } catch (error) {
      toast(error)
    }
  }

  const renderMessage = (item: AssistantMessage) => {
    const proposal = item.proposal
    let card = null
    if (proposal?.kind === 'changes') {
      card = (
        <AssistantProposalCard
          message={item}
          actions={proposal.actions}
          summary={proposal.summary}
          timeFormat={timeFormat}
          locked={applyingId !== null && applyingId !== item.id}
          onApply={() => requestApply(item, proposal.actions)}
          onDismiss={() => report({ id: item.id, status: 'dismissed' })}
        />
      )
    } else if (proposal?.kind === 'photoImport') {
      card = (
        <AssistantPhotoCard
          message={item}
          drafts={proposal.drafts}
          onImported={async (count) => {
            await report({ id: item.id, status: 'applied', outcome: { created: count } })
            onApplied()
            void message.success(t('photo.added', { count }))
          }}
          onDismiss={() => report({ id: item.id, status: 'dismissed' })}
        />
      )
    }
    // A proposal's summary already says it; a reply that only proposed shows the card alone.
    const text = proposal?.kind === 'changes' && item.text === proposal.summary ? '' : item.text
    return (
      <AssistantMessageItem key={item.id} from={item.role} text={text} photo={proposal?.kind === 'photo'}>
        {card}
      </AssistantMessageItem>
    )
  }

  const conversation = () => {
    if (chat.loadError !== null) return <ErrorState error={chat.loadError} onRetry={chat.reload} />
    if (!state) {
      return (
        <div className='flex justify-center py-10'>
          <Spin />
        </div>
      )
    }
    if (!state.included) {
      return (
        <EmptyState
          title={t('locked.title')}
          description={t('locked.body')}
          action={
            <AppLink href={ROUTES.providerProfilePlan} variant='button'>
              {t('locked.cta')}
            </AppLink>
          }
        />
      )
    }
    if (!state.available) return <EmptyState title={t('unavailable.title')} description={t('unavailable.body')} />
    if (chat.messagesError !== null) {
      return (
        <ErrorState
          error={chat.messagesError}
          onRetry={chat.activeId ? () => chat.select(chat.activeId as string) : undefined}
        />
      )
    }
    if (chat.loadingMessages) {
      return (
        <div className='flex justify-center py-10'>
          <Spin />
        </div>
      )
    }

    return (
      <ul className='m-0 flex list-none flex-col gap-3 p-0' aria-live='polite'>
        {!messages.length && chat.streaming === null && (
          <li className='flex flex-col gap-3'>
            <AppParagraph size='body-sm'>{t('intro')}</AppParagraph>
            <div className='flex flex-wrap gap-2'>
              {EXAMPLES.map((key) => (
                <AppButton key={key} size='small' onClick={() => setDraft(t(`examples.${key}`))}>
                  {t(`examples.${key}`)}
                </AppButton>
              ))}
            </div>
          </li>
        )}
        {messages.map(renderMessage)}
        {chat.streaming !== null && <AssistantMessageItem from='model' text={chat.streaming} streaming />}
      </ul>
    )
  }

  return (
    <>
      <section
        ref={panelRef}
        id={id}
        role='dialog'
        aria-modal='false'
        aria-labelledby={`${id}-title`}
        tabIndex={-1}
        hidden={!open}
        className={cn(
          'bg-surface fixed inset-0 z-50 flex flex-col outline-none app-safe-b',
          'md:border-brand-border md:inset-auto md:inset-e-4 md:rounded-brand md:border md:shadow-xl',
          // Expanded: docked along the bottom, edge to edge but for the gutters, clear of the
          // site header. The launcher hides meanwhile — this covers its spot.
          expanded
            ? 'md:inset-s-4 md:bottom-4 md:h-[min(56rem,calc(100dvh-6rem))]'
            : 'md:bottom-24 md:h-[min(42rem,calc(100dvh-11rem))] md:w-[min(26rem,calc(100vw-2rem))]',
          !open && 'hidden'
        )}
      >
        <header className='border-brand-border flex items-center gap-2 border-b px-4 py-3'>
          <RobotOutlined aria-hidden className='text-brand text-lg' />
          <div className='flex min-w-0 grow flex-col'>
            <AppText id={`${id}-title`} className='truncate font-semibold'>
              {t('title')}
            </AppText>
            {ready && (
              <AppText size='caption' tone='muted' className='truncate'>
                {state.usage.limit === null
                  ? t('usageUnlimited')
                  : t('usage', { used: state.usage.used, limit: state.usage.limit })}
              </AppText>
            )}
          </div>
          {/* Hiding classes sit on wrappers: antd's own unlayered `display` on a button beats them. */}
          <div className='flex shrink-0 items-center gap-0.5'>
          {ready && (
            <>
              <span className={cn('flex', expanded && 'md:hidden')}>
                <AppButton
                  size='medium'
                  type={listOpen ? 'default' : 'text'}
                  // Expanded on a desktop, the list is the side column already.
                  icon={<UnorderedListOutlined />}
                  aria-label={t('conversations.list')}
                  aria-pressed={listOpen}
                  title={t('conversations.list')}
                  onClick={() => setListOpen((current) => !current)}
                />
              </span>
              <AppButton
                size='medium'
                type='text'
                icon={<FormOutlined />}
                aria-label={t('conversations.new')}
                title={t('conversations.new')}
                disabled={chat.sending}
                onClick={() => {
                  chat.startNew()
                  setListOpen(false)
                }}
              />
              {chat.activeId && (
                <AppButton
                  size='medium'
                  type='text'
                  icon={<DeleteOutlined />}
                  aria-label={t('conversations.delete')}
                  title={t('conversations.delete')}
                  disabled={chat.sending}
                  onClick={() => setConfirmDelete(true)}
                />
              )}
            </>
          )}
          {/* Below `md` the panel is the whole screen already. */}
          <span className='flex max-md:hidden'>
          <AppButton
            size='medium'
            type='text'
            icon={expanded ? <ShrinkOutlined /> : <ExpandAltOutlined />}
            aria-label={t(expanded ? 'shrink' : 'expand')}
            aria-pressed={expanded}
            title={t(expanded ? 'shrink' : 'expand')}
            onClick={() => {
              setPanelState({ expanded: !expanded })
              setListOpen(false)
            }}
          />
          </span>
          <AppButton
            size='medium'
            type='text'
            icon={<CloseOutlined />}
            aria-label={tCommon('close')}
            title={tCommon('close')}
            onClick={onClose}
          />
          </div>
        </header>

        <div className='flex min-h-0 grow'>
          {ready && expanded && (
            <AssistantConversationList
              className='border-brand-border hidden w-72 shrink-0 overflow-y-auto border-e md:block'
              conversations={state.conversations}
              activeId={chat.activeId}
              timeFormat={timeFormat}
              disabled={chat.sending}
              onSelect={chat.select}
            />
          )}
          <div className='flex min-w-0 grow flex-col'>
            {ready && listOpen ? (
              <AssistantConversationList
                className='grow overflow-y-auto overscroll-contain'
                conversations={state.conversations}
                activeId={chat.activeId}
                timeFormat={timeFormat}
                disabled={chat.sending}
                onSelect={(conversationId) => {
                  chat.select(conversationId)
                  setListOpen(false)
                }}
              />
            ) : (
              <>
        <div ref={scrollRef} className='grow overflow-y-auto overscroll-contain px-4 py-3'>
          {/* A readable line length when expanded; no effect in the corner, which is narrower. */}
          <div className='mx-auto w-full max-w-3xl'>{conversation()}</div>
        </div>

        {ready && (
          <footer className='border-brand-border border-t px-4 py-3'>
            <div className='mx-auto flex w-full max-w-3xl flex-col gap-2'>
              {chat.sendError !== null && <ErrorAlert error={chat.sendError} />}
              {chat.dropped > 0 && (
                <AppText size='body-sm' tone='muted'>
                  {t('dropped', { count: chat.dropped })}
                </AppText>
              )}
              {spent && (
                <AppText size='body-sm' tone='muted'>
                  {t('spent', { limit: state.usage.limit ?? 0 })}
                </AppText>
              )}
              <AssistantComposer
                onSend={chat.send}
                onPhoto={() => setPhotoOpen(true)}
                disabled={spent || chat.sending}
                draft={draft}
                onDraftChange={setDraft}
              />
              <AppText tone='muted' className='text-xs'>
                {t('disclaimer')}
              </AppText>
            </div>
          </footer>
        )}
              </>
            )}
          </div>
        </div>
      </section>

      <PhotoImportSheet
        open={photoOpen}
        onClose={() => setPhotoOpen(false)}
        onImported={() => setPhotoOpen(false)}
        onRead={(note, drafts) => {
          setPhotoOpen(false)
          void chat.addPhotoRead(note, drafts).catch((error: unknown) => toast(error))
        }}
      />

      <ScheduleImpactModal
        impact={impactCheck?.impact ?? null}
        timeZone={impactCheck?.timeZone}
        timeFormat={timeFormat}
        copy={{ title: t('impact.title'), confirm: t('impact.confirm'), cancel: t('impact.cancel') }}
        onConfirm={async () => {
          if (!impactCheck) return
          // `applyProposal` reports its own failures; the dialog stays busy until it settles.
          await applyProposal(impactCheck.target, impactCheck.actions)
          setImpactCheck(null)
        }}
        onCancel={() => setImpactCheck(null)}
      />

      <AppConfirmModal
        open={confirmDelete}
        tone='danger'
        title={t('conversations.deleteTitle')}
        description={t('conversations.deleteBody')}
        okText={t('conversations.deleteConfirm')}
        onConfirm={async () => {
          if (chat.activeId) await chat.remove(chat.activeId)
          setConfirmDelete(false)
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  )
}
