'use client'

import { FC, useState } from 'react'
import { PlusOutlined } from '@ant-design/icons'
import { Alert } from 'antd'
import { useTranslations } from 'next-intl'
import { AssistantService } from '@api/profileAssistant/types'
import { WeekSchedule } from '@store/providers/profile/types'
import { TimeFormat } from '@interfaces/schedule'
import { ProviderServiceFormValues } from '@interfaces/services'
import { ASSISTANT_MAX_SERVICES } from '@constants/profileAssistant'
import { DAY_KEY_FORMAT } from '@constants/schedule'
import { PROVIDER_PROFILE_SERVICE_FORM_INITIAL_VALUES } from '@constants/services'
import { exceedsServiceCap, removedServices, serviceStatus } from '@helpers/profileAssistant'
import { openWeekdays } from '@helpers/serviceAvailability'
import { calendarDayOf } from '@helpers/timeZone'
import { toServiceAvailability, toServiceAvailabilityFormValues } from '@components/providerServiceForm/processors'
import { ProviderServiceForm } from '@components/providerServiceForm/ProviderServiceForm'
import { AppButton } from '@components/ui/AppButton'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { AppText } from '@components/ui/bare/AppText'
import { AssistantServiceRow } from '../AssistantServiceRow'

type Props = {
  services: AssistantService[]
  /** The provider's active services now — what each row is compared against. */
  current: AssistantService[]
  onChange: (services: AssistantService[]) => void
  /** A service is open in its editor; the review's Next waits for it. */
  onEditingChange: (editing: boolean) => void
  /** The hours as drafted in this review, so a service's days are checked against them. */
  weekSchedule: WeekSchedule
  timeZone?: string
  timeFormat: TimeFormat
  maxActiveServices: number | null
}

/** Which row is in the editor: an index into `services`, or a new one. */
type Editing = { index: number } | { index: 'new' } | null

const trimmedOrNull = (value: string | undefined | null): string | null => value?.trim() || null

/**
 * The Services tab's catalogue as the draft would leave it. Each service shows whether it is
 * new, changed or kept; one opens at a time in the Services tab's own form (photo aside — that
 * is added on the tab). A removed service is listed underneath until Approve, and can be put
 * back.
 */
export const ServicesStep: FC<Props> = ({
  services,
  current,
  onChange,
  onEditingChange,
  weekSchedule,
  timeZone,
  timeFormat,
  maxActiveServices,
}) => {
  const t = useTranslations('Settings.assistant')
  const [editing, setEditing] = useState<Editing>(null)
  const removed = removedServices(current, services)
  const overCap = exceedsServiceCap(current.length, services.length, maxActiveServices)

  const edit = (next: Editing): void => {
    setEditing(next)
    onEditingChange(next !== null)
  }

  const toFormValues = (service?: AssistantService): ProviderServiceFormValues => {
    const availability = toServiceAvailabilityFormValues(
      service?.availability,
      openWeekdays(weekSchedule),
      calendarDayOf(new Date(), timeZone).format(DAY_KEY_FORMAT)
    )
    return service
      ? {
          name: service.name,
          duration: service.duration,
          description: service.description ?? undefined,
          price: service.price ?? undefined,
          currency: service.currency ?? undefined,
          availability,
        }
      : { ...PROVIDER_PROFILE_SERVICE_FORM_INITIAL_VALUES, availability }
  }

  const save = (values: ProviderServiceFormValues): void => {
    if (!editing || values.duration === undefined) return
    const id = editing.index === 'new' ? null : (services[editing.index]?.id ?? null)
    const service: AssistantService = {
      id,
      name: values.name.trim(),
      description: trimmedOrNull(values.description),
      duration: values.duration,
      price: values.price ?? null,
      currency: trimmedOrNull(values.currency)?.toUpperCase() ?? null,
      availability: toServiceAvailability(values.availability),
    }
    onChange(
      editing.index === 'new'
        ? [...services, service]
        : services.map((existing, index) => (index === editing.index ? service : existing))
    )
    edit(null)
  }

  if (editing) {
    return (
      <ProviderServiceForm
        key={String(editing.index)}
        initialValues={toFormValues(editing.index === 'new' ? undefined : services[editing.index])}
        isSubmitting={false}
        onSubmit={save}
        closeModal={() => edit(null)}
        weekSchedule={weekSchedule}
        timeZone={timeZone}
        timeFormat={timeFormat}
        withImage={false}
      />
    )
  }

  return (
    <div className='flex flex-col gap-3'>
      {services.length ? (
        services.map((service, index) => (
          <AssistantServiceRow
            key={service.id ?? `new-${index}`}
            service={service}
            status={serviceStatus(service, current)}
            onEdit={() => edit({ index })}
            onRemove={() => onChange(services.filter((_, other) => other !== index))}
          />
        ))
      ) : (
        <AppParagraph size='body-sm' tone='muted' className='m-0'>
          {t('noServices')}
        </AppParagraph>
      )}

      {services.length < ASSISTANT_MAX_SERVICES && (
        <AppButton type='dashed' icon={<PlusOutlined />} onClick={() => edit({ index: 'new' })} className='self-start'>
          {t('addService')}
        </AppButton>
      )}

      {overCap && maxActiveServices !== null && (
        <Alert type='warning' showIcon title={t('serviceCap', { max: maxActiveServices })} />
      )}

      {removed.length > 0 && (
        <div className='flex flex-col gap-2 pt-2'>
          <AppText className='font-semibold'>{t('removedTitle')}</AppText>
          <AppText size='body-sm' tone='muted'>
            {t('removedHint')}
          </AppText>
          {removed.map((service) => (
            <AssistantServiceRow
              key={service.id}
              service={service}
              status='removed'
              onRestore={() => onChange([...services, service])}
            />
          ))}
        </div>
      )}
    </div>
  )
}
