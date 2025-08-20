'use client'

import { useMemo, useState } from 'react'
import { EditOutlined, MinusCircleFilled, PlusOutlined } from '@ant-design/icons'
import { Checkbox, CheckboxProps, Col, Flex, Modal, ModalProps, Row, TimePicker, Typography } from 'antd'
import { RangePickerProps } from 'antd/es/date-picker'
import { Rule } from 'antd/es/form'
import { DaySchedule, WeekSchedule } from '@store/providers/profile/types'
import { AppFormProps } from '@interfaces/forms'
import { ProviderProfileFormValues } from '@interfaces/providers'
import { WeekDay } from '@interfaces/schedule'
import { WEEK_DAYS_LIST } from '@constants/schedule'
import { splitScheduleIntoParts } from '@helpers/schedule'
import AppButton from '@components/ui/AppButton'
import { WEEK_DAYS_SELECTION_ADDITIONAL_OPTIONS } from './constants'
import ProviderProfileFormItem from './ProviderProfileFormItem'

type Props = AppFormProps<ProviderProfileFormValues>

const ProviderProfileWeekSchedule: React.FC<Props> = ({ formik }) => {
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

  const onScheduleChangesConfirm: ModalProps['onOk'] = async () => {
    const weekSchedule: WeekSchedule = { ...formik.values.weekSchedule }
    Object.keys(selectedDays).forEach((day) => {
      const currentDay = day as WeekDay
      if (!selectedDays[currentDay] || !tempAvailability || !tempAvailability[0] || !tempAvailability[1]) {
        weekSchedule[currentDay] = weekSchedule[currentDay]
        return
      }

      const formattedAvailability = {
        start: tempAvailability[0].format('hh:mm'),
        end: tempAvailability[1].format('hh:mm'),
      }

      const formattedBreaks = tempBreaks.reduce((acc, datesArr) => {
        if (!datesArr || datesArr.includes(undefined)) return acc
        acc.push({
          start: datesArr[0]!.format('hh:mm'),
          end: datesArr[1]!.format('hh:mm'),
        })
        return acc
      }, [] as DaySchedule['breaks'])

      weekSchedule[currentDay] = {
        availability: formattedAvailability,
        breaks: formattedBreaks
      }
    })

    await formik.setFieldValue('weekSchedule', weekSchedule)
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
    return Object.values(formik.values.weekSchedule).some((daySchedule) => daySchedule.availability.start && daySchedule.availability.end)
  }, [formik.values.weekSchedule])

  const areChangesComplete = useMemo(() => {
    return selectedDaysList.length > 0 && tempBreaks.every((range) => range?.[0] && range?.[1])
  }, [selectedDaysList, tempBreaks])

  const rules: Rule[] = useMemo(() => {
    const result: Rule[] = [
      {
        required: true,
        validator: async () => {
          if (!hasFilledRanges) return new Promise((_, reject) => reject());
        },
        validateTrigger: 'onSubmit',
        message: 'Please select at least one day and fill in the schedule.',
      },
    ]
    return result
  }, [hasFilledRanges])

  return (
    <ProviderProfileFormItem name='weekSchedule' label='Week Schedule' rules={rules}>
      <Flex vertical gap={16}>
        <Row>
          {
            WEEK_DAYS_SELECTION_ADDITIONAL_OPTIONS.map(({ label, childFieldNames }) => {
              const checked = childFieldNames.every((day) => selectedDays[day])
              return (
                <Col key={label} span={8} className='my-1'>
                  <Checkbox checked={checked} value={label} onChange={onAdditionalOptionSelected} className='capitalize'>
                    {label}
                  </Checkbox>
                </Col>
              )
            })
          }
          {WEEK_DAYS_LIST.map((day) => {
            return (
              <Col key={day} span={8} className='my-1'>
                <Checkbox checked={selectedDays[day]} value={day} onChange={onDaySelected} className='capitalize'>
                  {day} {selectedDays[day]}
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

        <Modal
          title='Rescheduling'
          open={!!isEditScheduleModalOpened}
          onOk={onScheduleChangesConfirm}
          okButtonProps={{ disabled: !areChangesComplete }}
          onCancel={() => setIsEditScheduleModalOpened(false)}
          okText='Confirm'
          cancelText='Cancel'
          centered
        >
          <Flex vertical gap={8}>
            <Typography.Paragraph>
              for{' '}
              {selectedDaysList.map((day, i, arr) => (
                <Typography.Text className='capitalize' key={day}>
                  {day}
                  {i < arr.length - 1 ? ', ' : ''}
                </Typography.Text>
              ))}
            </Typography.Paragraph>
            <TimePicker.RangePicker
              size='large'
              className='grow'
              use12Hours
              showNow
              value={tempAvailability}
              format={'hh:mm'}
              onChange={onAvailabilityChange}
              minuteStep={5}
              separator={'-'}
              name='weekSchedule'
            />
            {
              tempBreaks.length > 0 && (
                <Typography.Paragraph className='text-lg font-semibold mt-4 mb-0!'>
                  Breaks
                </Typography.Paragraph>
              )
            }
            {tempBreaks.map((range, index) => {
              return (
                <Flex gap={8} key={index}>
                  <TimePicker.RangePicker
                    size='large'
                    className='grow'
                    use12Hours
                    showNow
                    value={range}
                    format={'hh:mm'}
                    onChange={(dates, dateStrings) => onRangeChange(dates, dateStrings, index)}
                    minuteStep={5}
                    separator={'-'}
                  />
                  <AppButton
                    size='large'
                    danger
                    icon={<MinusCircleFilled />}
                    type='text'
                    onClick={() => onRemoveRangeClick(index)}
                  />
                </Flex>
              )
            })}
            <AppButton
              icon={<PlusOutlined />}
              type='link'
              onClick={onAddRangeClick}
              className='text-left! w-fit text-xs! mt-0!'
              size='small'
            >
              Add break
            </AppButton>
          </Flex>
        </Modal>

        {hasFilledRanges && (
          <Flex vertical gap={8}>
            <Typography.Text strong>Current Schedule:</Typography.Text>
            <Flex wrap='wrap' vertical gap={8}>
              {WEEK_DAYS_LIST.map((day) => {
                const daySchedule = formik.values.weekSchedule[day]
                const splittedSchedule = splitScheduleIntoParts(daySchedule)

                return (
                  <Flex key={day} gap={4}>
                    <Typography.Text className=' font-semibold capitalize'>{day}: </Typography.Text>
                    <Typography.Text>
                      {splittedSchedule.map((range) => `${range.start} - ${range.end}`).join(' | ') || '-'}
                    </Typography.Text>
                  </Flex>
                )
              })}
            </Flex>
          </Flex>
        )}
      </Flex>
    </ProviderProfileFormItem>
  )
}

export default ProviderProfileWeekSchedule
