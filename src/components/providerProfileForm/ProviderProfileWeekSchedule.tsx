'use client'

import { useMemo, useState } from 'react'
import { EditOutlined, MinusCircleFilled, PlusOutlined } from '@ant-design/icons'
import { Checkbox, CheckboxProps, Col, Flex, Row, TimePicker, Typography } from 'antd'
import { RangePickerProps } from 'antd/es/date-picker'
import { Rule } from 'antd/es/form'
import { useTranslations } from 'next-intl'
import { DaySchedule, WeekSchedule } from '@store/providers/profile/types'
import { WeekDay } from '@interfaces/schedule'
import { SCHEDULE_DISPLAY_FORMAT, SCHEDULE_VALUE_FORMAT, WEEK_DAYS_LIST } from '@constants/schedule'
import { splitScheduleIntoParts } from '@helpers/schedule'
import { AppButton } from '@components/ui/AppButton'
import { AppFormItem } from '@components/ui/AppFormItem'
import { AppSheet } from '@components/ui/AppSheet'
import { WEEK_DAYS_SELECTION_ADDITIONAL_OPTIONS } from './constants'

/**
 * Injected by `Form.Item` — see `ProviderProfileFormCategories` for why a custom control
 * must accept both. The whole week is one form value, so the sheet edits a copy and hands
 * the finished object back through `onChange` on confirm.
 */
type Props = {
  value?: WeekSchedule
  onChange?: (next: WeekSchedule) => void
}

export const ProviderProfileWeekSchedule: React.FC<Props> = ({ value, onChange }) => {
  // Memoised so the fallback is not a fresh object on every render, which would change
  // the identity every `useMemo` below depends on.
  const schedule = useMemo(() => value ?? ({} as WeekSchedule), [value])
  const t = useTranslations('ProfileCreation')
  const tDays = useTranslations('Settings.availability.days')
  const tCommon = useTranslations('Common')
  const [isEditScheduleModalOpened, setIsEditScheduleModalOpened] = useState(false)
  const [selectedDays, setSelectedDays] = useState<Partial<Record<WeekDay, boolean>>>({})
  const [tempAvailability, setTempAvailability] = useState<RangePickerProps['value']>([undefined, undefined])
  const [tempBreaks, setTempBreaks] = useState<RangePickerProps['value'][]>([])

  const selectedDaysList = useMemo(() => {
    return Object.keys(selectedDays).filter((day) => selectedDays[day as WeekDay])
  }, [selectedDays])

  const onDaySelected: CheckboxProps['onChange'] = (e) => {
    const dayName = e.target.value as WeekDay
    setSelectedDays((prev) => {
      const newState = { ...prev }
      newState[dayName] = !newState[dayName]
      return newState
    })
  }

  const onAdditionalOptionSelected: CheckboxProps['onChange'] = (e) => {
    const optionLabel = e.target.value
    setSelectedDays((prev) => {
      const newState = { ...prev }
      const option = structuredClone(WEEK_DAYS_SELECTION_ADDITIONAL_OPTIONS).find((opt) => opt.label === optionLabel)
      if (option) {
        option.childFieldNames.forEach((day) => {
          newState[day] = e.target.checked
        })
      }
      return newState
    })
  }

  const onScheduleChangesConfirm = async () => {
    const weekSchedule: WeekSchedule = { ...schedule }
    Object.keys(selectedDays).forEach((day) => {
      const currentDay = day as WeekDay
      if (!selectedDays[currentDay] || !tempAvailability || !tempAvailability[0] || !tempAvailability[1]) return

      // Always persist as 24-hour `HH:mm`. `hh:mm` is 12-hour without a
      // meridiem, so 14:30 would be stored as "02:30" and become
      // indistinguishable from 02:30.
      const formattedAvailability = {
        start: tempAvailability[0].format(SCHEDULE_VALUE_FORMAT),
        end: tempAvailability[1].format(SCHEDULE_VALUE_FORMAT),
      }

      const formattedBreaks = tempBreaks.reduce(
        (acc, datesArr) => {
          if (!datesArr || datesArr.includes(undefined)) return acc
          acc.push({
            start: datesArr[0]!.format(SCHEDULE_VALUE_FORMAT),
            end: datesArr[1]!.format(SCHEDULE_VALUE_FORMAT),
          })
          return acc
        },
        [] as DaySchedule['breaks']
      )

      weekSchedule[currentDay] = {
        availability: formattedAvailability,
        breaks: formattedBreaks,
      }
    })

    onChange?.(weekSchedule)
    setIsEditScheduleModalOpened(false)
  }

  const onAvailabilityChange: RangePickerProps['onChange'] = (dates) => {
    setTempAvailability(dates)
  }

  const onRangeChange = (
    dates: Parameters<NonNullable<RangePickerProps['onChange']>>[0],
    _dateStrings: Parameters<NonNullable<RangePickerProps['onChange']>>[1],
    index: number
  ) => {
    setTempBreaks((prev) => {
      return prev.map((range, i) => {
        return i === index ? dates : range
      })
    })
  }

  const onRemoveRangeClick = (index: number) => {
    setTempBreaks((prev) => {
      return prev.filter((_, i) => i !== index)
    })
  }

  const onAddRangeClick = () => {
    setTempBreaks((prev) => {
      return [...prev, [undefined, undefined]]
    })
  }

  const hasFilledRanges = useMemo(() => {
    return Object.values(schedule).some(
      (daySchedule) => daySchedule.availability.start && daySchedule.availability.end
    )
  }, [schedule])

  const areChangesComplete = useMemo(() => {
    return selectedDaysList.length > 0 && tempBreaks.every((range) => range?.[0] && range?.[1])
  }, [selectedDaysList, tempBreaks])

  const rules: Rule[] = useMemo(() => {
    const result: Rule[] = [
      {
        required: true,
        validator: async () => {
          if (!hasFilledRanges) return new Promise((_, reject) => reject())
        },
        validateTrigger: 'onSubmit',
        message: t('scheduleRequired'),
      },
    ]
    return result
  }, [hasFilledRanges, t])

  const scheduleEditor = (
    <Flex vertical gap={8}>
      <Typography.Paragraph>
        for{' '}
        {selectedDaysList.map((day, i, arr) => (
          <Typography.Text key={day}>
            {tDays(day)}
            {i < arr.length - 1 ? ', ' : ''}
          </Typography.Text>
        ))}
      </Typography.Paragraph>
      <TimePicker.RangePicker
        className='grow'
        use12Hours
        showNow
        value={tempAvailability}
        format={SCHEDULE_DISPLAY_FORMAT}
        onChange={onAvailabilityChange}
        minuteStep={5}
        separator={'-'}
        name='weekSchedule'
      />
      {tempBreaks.length > 0 && (
        <Typography.Paragraph className='mt-4 mb-0 text-lg font-semibold'>Breaks</Typography.Paragraph>
      )}
      {tempBreaks.map((range, index) => {
        return (
          <Flex gap={8} key={index} align='center'>
            <TimePicker.RangePicker
              className='grow'
              use12Hours
              showNow
              value={range}
              format={SCHEDULE_DISPLAY_FORMAT}
              onChange={(dates, dateStrings) => onRangeChange(dates, dateStrings, index)}
              minuteStep={5}
              separator={'-'}
            />
            <AppButton
              danger
              icon={<MinusCircleFilled />}
              type='text'
              aria-label={t('removeBreak', { n: index + 1 })}
              className='min-h-11 min-w-11'
              onClick={() => onRemoveRangeClick(index)}
            />
          </Flex>
        )
      })}
      <AppButton
        icon={<PlusOutlined />}
        type='link'
        onClick={onAddRangeClick}
        className='mt-0 w-fit text-left text-xs'
        size='small'
      >
        Add break
      </AppButton>
      <Flex gap={8} justify='end' className='mt-4'>
        <AppButton onClick={() => setIsEditScheduleModalOpened(false)}>{tCommon('cancel')}</AppButton>
        <AppButton type='primary' disabled={!areChangesComplete} onClick={onScheduleChangesConfirm}>
          {tCommon('confirm')}
        </AppButton>
      </Flex>
    </Flex>
  )

  return (
    <AppFormItem name='weekSchedule' label={t('weekSchedule')} rules={rules}>
      <Flex vertical gap={16}>
        <Row gutter={[8, 8]}>
          {WEEK_DAYS_SELECTION_ADDITIONAL_OPTIONS.map(({ label, childFieldNames }) => {
            const checked = childFieldNames.every((day) => selectedDays[day])
            return (
              <Col key={label} xs={12} sm={8} lg={6}>
                <Checkbox checked={checked} value={label} onChange={onAdditionalOptionSelected} className='capitalize'>
                  {label}
                </Checkbox>
              </Col>
            )
          })}
          {WEEK_DAYS_LIST.map((day) => {
            return (
              <Col key={day} xs={12} sm={8} lg={6}>
                <Checkbox checked={selectedDays[day]} value={day} onChange={onDaySelected}>
                  {day}
                </Checkbox>
              </Col>
            )
          })}
        </Row>

        {!!selectedDaysList.length && (
          <AppButton icon={<EditOutlined />} type='dashed' onClick={() => setIsEditScheduleModalOpened(true)}>
            Edit Schedule
          </AppButton>
        )}

        <AppSheet
          title={t('rescheduling')}
          open={!!isEditScheduleModalOpened}
          onClose={() => setIsEditScheduleModalOpened(false)}
        >
          {scheduleEditor}
        </AppSheet>

        {hasFilledRanges && (
          <Flex vertical gap={8}>
            <Typography.Text strong>Current Schedule:</Typography.Text>
            <Flex wrap='wrap' vertical gap={8}>
              {WEEK_DAYS_LIST.map((day) => {
                const daySchedule = schedule[day]
                const splittedSchedule = splitScheduleIntoParts(daySchedule)

                return (
                  <Flex key={day} gap={4}>
                    <Typography.Text className='font-semibold tnum'>{tDays(day)}: </Typography.Text>
                    <Typography.Text className='tnum'>
                      {splittedSchedule.map((range) => `${range.start} - ${range.end}`).join(' | ') || '-'}
                    </Typography.Text>
                  </Flex>
                )
              })}
            </Flex>
          </Flex>
        )}
      </Flex>
    </AppFormItem>
  )
}
