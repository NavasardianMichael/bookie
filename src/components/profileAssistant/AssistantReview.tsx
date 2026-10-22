'use client'

import { FC, useMemo, useState } from 'react'
import { Form, Steps, Tag } from 'antd'
import { useLocale, useTranslations } from 'next-intl'
import { applyProfileAssistantAPI } from '@api/profileAssistant/main'
import { AssistantProposal, AssistantService } from '@api/profileAssistant/types'
import { ProviderProfile } from '@store/providers/profile/types'
import { useUnsavedChangesGuard } from '@hooks/useUnsavedChangesGuard'
import { ASSISTANT_STEPS } from '@constants/profileAssistant'
import { isFormValidationError, processError } from '@helpers/error'
import {
  AssistantReviewValues,
  AssistantStep,
  changedSteps,
  exceedsServiceCap,
  proposalToReviewValues,
  reviewValuesToProposal,
} from '@helpers/profileAssistant'
import { resolveTimeFormat } from '@helpers/timeFormat'
import { AppButton } from '@components/ui/AppButton'
import { AppText } from '@components/ui/bare/AppText'
import { ErrorAlert } from '@components/ui/ErrorAlert'
import { AssistantPlanAction } from './AssistantPlanAction'
import { AdvancedStep } from './steps/AdvancedStep'
import { ApprovalsStep } from './steps/ApprovalsStep'
import { AvailabilityStep } from './steps/AvailabilityStep'
import { NotificationsStep } from './steps/NotificationsStep'
import { PaymentsStep } from './steps/PaymentsStep'
import { ProfileStep } from './steps/ProfileStep'
import { SeoStep } from './steps/SeoStep'
import { ServicesStep } from './steps/ServicesStep'
import { SummaryStep } from './steps/SummaryStep'
import { useAssistantStepTitle } from './useAssistantStepTitle'

type Props = {
  /** The workspace now, in the proposal's shape. */
  current: AssistantProposal
  proposal: AssistantProposal
  profile: ProviderProfile
  /** Back to the description, keeping what was typed. */
  onRewrite: () => void
  onPendingChange: (pending: boolean) => void
  onApplied: () => void
}

/** The fields each step validates before moving on; steps not listed have nothing to check. */
const STEP_FIELDS: Partial<Record<AssistantStep, (keyof AssistantReviewValues)[]>> = {
  profile: ['fullName', 'description', 'categories'],
  payments: ['paymentNotes'],
  seo: ['seoTitle', 'seoDescription', 'slug'],
}

const SUMMARY_INDEX = ASSISTANT_STEPS.length - 1

/**
 * Step two: every settings tab the assistant drafts, one step each, then a summary. Nothing is
 * saved until Approve, which sends the whole reviewed workspace in one request.
 *
 * One antd `Form` holds every step's fields and keeps them while a step is off screen, so an
 * edit survives moving between steps. `component={false}`: no `<form>` element of its own,
 * because the Services step opens the Services tab's form inside it, and a `<form>` may not
 * nest. Services live beside it in state — each is edited in that form, not this one.
 */
export const AssistantReview: FC<Props> = ({ current, proposal, profile, onRewrite, onPendingChange, onApplied }) => {
  const t = useTranslations('Settings.assistant')
  const tErrors = useTranslations('Errors')
  const stepTitle = useAssistantStepTitle()
  const locale = useLocale()
  const [form] = Form.useForm<AssistantReviewValues>()
  const initialValues = useMemo(() => proposalToReviewValues(proposal), [proposal])
  const [services, setServices] = useState<AssistantService[]>(proposal.services)
  const [step, setStep] = useState(0)
  const [editingService, setEditingService] = useState(false)
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState<unknown>(null)
  useUnsavedChangesGuard(true)

  // Every field, mounted or not — `preserve` keeps the off-screen steps' values in the store.
  const watched = Form.useWatch([], { form, preserve: true }) as AssistantReviewValues | undefined
  const reviewed = useMemo(
    () => reviewValuesToProposal({ ...initialValues, ...watched }, services),
    [initialValues, watched, services]
  )
  const changed = useMemo(() => changedSteps(current, reviewed), [current, reviewed])

  const stepKey = ASSISTANT_STEPS[step]!
  const timeFormat = resolveTimeFormat(reviewed.timeFormat ?? undefined, locale)
  const maxActiveServices = profile.personal.entitlements?.maxActiveServices ?? null
  const overCap = exceedsServiceCap(current.services.length, services.length, maxActiveServices)
  const blocked = editingService || (stepKey === 'services' && overCap)

  const goTo = async (next: number): Promise<void> => {
    if (next > step) {
      try {
        await form.validateFields(STEP_FIELDS[stepKey] ?? [])
      } catch (reason) {
        // A field that failed its rules is already marked under that field.
        if (isFormValidationError(reason)) return
        throw reason
      }
    }
    setStep(Math.max(0, Math.min(next, SUMMARY_INDEX)))
  }

  const apply = async (): Promise<void> => {
    setApplying(true)
    onPendingChange(true)
    setError(null)
    try {
      await applyProfileAssistantAPI(reviewValuesToProposal(form.getFieldsValue(true), services))
      onApplied()
    } catch (reason) {
      setError(reason)
      // A taken link is fixed on the SEO step, where the field is.
      if (processError(reason).code === 409) setStep(ASSISTANT_STEPS.indexOf('seo'))
    } finally {
      setApplying(false)
      onPendingChange(false)
    }
  }

  const body = {
    profile: <ProfileStep />,
    services: (
      <ServicesStep
        services={services}
        current={current.services}
        onChange={setServices}
        onEditingChange={setEditingService}
        weekSchedule={reviewed.weekSchedule}
        timeZone={reviewed.timeZone ?? undefined}
        timeFormat={timeFormat}
        maxActiveServices={maxActiveServices}
      />
    ),
    availability: <AvailabilityStep timeFormat={timeFormat} />,
    approvals: <ApprovalsStep />,
    payments: <PaymentsStep />,
    seo: <SeoStep slugLocked={profile.personal.entitlements?.customSlug === false} />,
    notifications: <NotificationsStep />,
    advanced: <AdvancedStep />,
    summary: <SummaryStep current={current} reviewed={reviewed} />,
  } satisfies Record<AssistantStep, React.ReactNode>

  return (
    <Form<AssistantReviewValues>
      form={form}
      component={false}
      layout='vertical'
      requiredMark={false}
      initialValues={initialValues}
      disabled={applying}
      preserve
    >
      <div className='flex flex-col gap-5'>
        <Steps
          type='inline'
          current={step}
          onChange={(next) => void goTo(next)}
          items={ASSISTANT_STEPS.map((key) => ({ title: stepTitle(key), disabled: blocked || applying }))}
        />

        <div className='flex flex-wrap items-center justify-between gap-2'>
          <div className='flex flex-col'>
            <AppText size='caption' tone='muted'>
              {t('stepOf', { current: step + 1, total: ASSISTANT_STEPS.length })}
            </AppText>
            <AppText className='text-h3 font-bold'>{stepTitle(stepKey)}</AppText>
          </div>
          {stepKey !== 'summary' && (
            <Tag color={changed.has(stepKey) ? 'blue' : undefined} className='m-0'>
              {t(changed.has(stepKey) ? 'changed' : 'unchanged')}
            </Tag>
          )}
        </div>

        {body[stepKey]}

        {error !== null && (
          <ErrorAlert
            error={error}
            overrides={{ 409: tErrors('conflicts.slugTaken') }}
            action={<AssistantPlanAction error={error} />}
          />
        )}

        {!editingService && (
          <div className='border-brand-border flex flex-wrap justify-between gap-2 border-t pt-4'>
            {step === 0 ? (
              <AppButton onClick={onRewrite} disabled={applying}>
                {t('rewrite')}
              </AppButton>
            ) : (
              <AppButton onClick={() => void goTo(step - 1)} disabled={applying}>
                {t('back')}
              </AppButton>
            )}
            {step === SUMMARY_INDEX ? (
              <AppButton type='primary' loading={applying} disabled={overCap} onClick={() => void apply()}>
                {t('approve')}
              </AppButton>
            ) : (
              <AppButton type='primary' disabled={blocked} onClick={() => void goTo(step + 1)}>
                {t('next')}
              </AppButton>
            )}
          </div>
        )}
      </div>
    </Form>
  )
}
