'use client'

import { FC, useMemo, useState } from 'react'
import { CheckCircleFilled, CloseCircleFilled, ExclamationCircleOutlined, MailOutlined } from '@ant-design/icons'
import { Tag } from 'antd'
import { useTranslations } from 'next-intl'
import { AssistantAction, AssistantActionOutcome, AssistantMessage } from '@api/assistant/types'
import { TimeFormat } from '@interfaces/schedule'
import { assistantActionRoute, emailsClients } from '@helpers/assistant'
import { cn } from '@helpers/cn'
import { AppButton } from '@components/ui/AppButton'
import { AppLink } from '@components/ui/bare/AppLink'
import { AppText } from '@components/ui/bare/AppText'
import { useAssistantActionLines } from './useAssistantActionLines'

type Props = {
  message: AssistantMessage
  actions: AssistantAction[]
  summary: string
  timeFormat: TimeFormat
  /** Awaited — the card stays busy until the apply settles. */
  onApply: () => Promise<void>
  onDismiss: () => Promise<void>
  /** Another proposal is being applied; this one waits. */
  locked?: boolean
}

const STATUS_COLOR = { pending: 'processing', applied: 'success', partial: 'warning', dismissed: 'default' } as const

/**
 * A proposal, as the provider approves it: every change in plain words, grouped by the settings
 * page it belongs to — each group with **Adjust myself**, a link to that page to make the change
 * by hand instead — then Apply or Dismiss. Nothing is changed until Apply; once decided, each
 * change shows whether it went through.
 */
export const AssistantProposalCard: FC<Props> = ({ message, actions, summary, timeFormat, onApply, onDismiss, locked }) => {
  const t = useTranslations('Assistant')
  const describe = useAssistantActionLines(timeFormat)
  const [busy, setBusy] = useState<'apply' | 'dismiss' | null>(null)
  const status = message.proposalStatus ?? 'pending'
  const outcomes = Array.isArray(message.outcome) ? (message.outcome as AssistantActionOutcome[]) : []

  const groups = useMemo(() => {
    const byRoute = new Map<string, { route: string; items: { action: AssistantAction; index: number }[] }>()
    actions.forEach((action, index) => {
      const route = assistantActionRoute(action.type)
      const group = byRoute.get(route) ?? { route, items: [] }
      group.items.push({ action, index })
      byRoute.set(route, group)
    })
    return [...byRoute.values()]
  }, [actions])

  const act = async (kind: 'apply' | 'dismiss'): Promise<void> => {
    setBusy(kind)
    try {
      await (kind === 'apply' ? onApply() : onDismiss())
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className='border-brand-border bg-surface flex flex-col gap-3 rounded-brand border p-4'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <AppText className='font-semibold'>{t('proposal.title')}</AppText>
        <Tag color={STATUS_COLOR[status]}>{t(`proposal.status.${status}`)}</Tag>
      </div>
      {summary && (
        <AppText size='body-sm' tone='muted' className='block'>
          {summary}
        </AppText>
      )}

      {groups.map((group) => (
        <div key={group.route} className='border-brand-border-subtle flex flex-col gap-1 border-t pt-2'>
          <ul className='m-0 flex list-none flex-col gap-1 p-0'>
            {group.items.flatMap(({ action, index }) =>
              describe(action).map((line, lineIndex) => {
                const outcome = outcomes[index]
                return (
                  <li key={`${index}-${lineIndex}`} className='flex items-start gap-2'>
                    {outcome ? (
                      outcome.ok ? (
                        <CheckCircleFilled aria-label={t('proposal.done')} className='text-brand-success mt-1' />
                      ) : (
                        <CloseCircleFilled aria-label={t('proposal.failed')} className='text-brand-danger mt-1' />
                      )
                    ) : line.warn ? (
                      <ExclamationCircleOutlined aria-hidden className='text-brand-warning mt-1' />
                    ) : (
                      <span aria-hidden className='bg-brand mt-2 size-1.5 shrink-0 rounded-full' />
                    )}
                    <AppText size='body-sm' className={cn(status === 'dismissed' && 'line-through')}>
                      {line.text}
                    </AppText>
                  </li>
                )
              })
            )}
          </ul>
          {status === 'pending' && (
            <AppLink href={group.route} className='text-body-sm self-start'>
              {t('proposal.adjust')}
            </AppLink>
          )}
        </div>
      ))}

      {status === 'pending' && (
        <>
          {emailsClients(actions) && (
            <AppText size='body-sm' tone='muted' className='flex items-center gap-2'>
              <MailOutlined aria-hidden />
              {t('proposal.emailsClients')}
            </AppText>
          )}
          <div className='flex flex-wrap gap-2'>
            <AppButton
              type='primary'
              loading={busy === 'apply'}
              disabled={locked || busy !== null}
              onClick={() => void act('apply')}
            >
              {t('proposal.apply')}
            </AppButton>
            <AppButton loading={busy === 'dismiss'} disabled={locked || busy !== null} onClick={() => void act('dismiss')}>
              {t('proposal.dismiss')}
            </AppButton>
          </div>
        </>
      )}
    </div>
  )
}
