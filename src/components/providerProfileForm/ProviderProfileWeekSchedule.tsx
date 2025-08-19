'use client'

import { useMemo, useState } from 'react'
import { EditOutlined, MinusCircleFilled, PlusOutlined } from '@ant-design/icons'
import { Checkbox, CheckboxProps, Col, Flex, Modal, ModalProps, Row, TimePicker, Typography } from 'antd'
import { RangePickerProps } from 'antd/es/date-picker'
import { DaySchedule, WeekSchedule } from '@store/providers/profile/types'
import { AppFormProps } from '@interfaces/forms'
import { ProviderProfileFormValues } from '@interfaces/providers'
import { WeekDay } from '@interfaces/schedule'
import { WEEK_DAYS_LIST } from '@constants/schedule'
import AppButton from '@components/ui/AppButton'

type Props = AppFormProps<ProviderProfileFormValues>

const ProviderProfileWeekSchedule: React.FC<Props> = ({ formik }) => {
  const [isEditScheduleModalOpened, setIsEditScheduleModalOpened] = useState(false)
  const [selectedDays, setSelectedDays] = useState<Partial<Record<WeekDay, boolean>>>({})
  const [tempRanges, setTempRanges] = useState<RangePickerProps['value'][]>([[undefined, undefined]])

  const selectedDaysList = useMemo(() => {
    return Object.keys(selectedDays).filter((day) => selectedDays[day as WeekDay])
  }, [selectedDays])

  const onDaySelected: CheckboxProps['onChange'] = (e) => {
    const dayName = e.target.value as WeekDay

    console.log({ dayName })
    setSelectedDays((prev) => {
      const newState = { ...prev }
      newState[dayName] = !newState[dayName]
      return newState
    })
  }

  const onScheduleChangesConfirm: ModalProps['onOk'] = async () => {
    const weekSchedule: WeekSchedule = { ...formik.values.weekSchedule }
    Object.keys(selectedDays).forEach((day) => {
      if (!selectedDays[day as WeekDay]) {
        weekSchedule[day as WeekDay] = []
        return
      }
      const formattedWeekDaySchedule = tempRanges.reduce((acc, datesArr) => {
        if (!datesArr || datesArr.includes(undefined)) return acc
        acc.push({
          start: datesArr[0]!.format('hh:mm'),
          end: datesArr[1]!.format('hh:mm'),
        })
        return acc
      }, [] as DaySchedule)
      weekSchedule[day as WeekDay] = formattedWeekDaySchedule
    })
    console.log({ weekSchedule })

    await formik.setFieldValue('weekSchedule', weekSchedule)
    setIsEditScheduleModalOpened(false)
  }

  const onRangeChange = (
    dates: Parameters<NonNullable<RangePickerProps['onChange']>>[0],
    _dateStrings: Parameters<NonNullable<RangePickerProps['onChange']>>[1],
    index: number
  ) => {
    setTempRanges((prev) => {
      return prev.map((range, i) => {
        return i === index ? dates : range
      })
    })
  }

  const onRemoveRangeClick = (index: number) => {
    setTempRanges((prev) => {
      return prev.filter((_, i) => i !== index)
    })
  }

  const onAddRangeClick = () => {
    setTempRanges((prev) => {
      return [...prev, [undefined, undefined]]
    })
  }

  const hasFilledRanges = useMemo(() => {
    return Object.values(formik.values.weekSchedule).some((daySchedule) => daySchedule.length > 0)
  }, [formik.values.weekSchedule])

  const areChangesComplete = useMemo(() => {
    return selectedDaysList.length > 0 && tempRanges.every((range) => range?.[0] && range?.[1])
  }, [selectedDaysList, tempRanges])

  return (
    <Flex vertical gap={16}>
      <Checkbox.Group className='flex gap-4'>
        <Row>
          {WEEK_DAYS_LIST.map((day) => {
            return (
              <Col key={day} span={8} className='my-1'>
                <Checkbox checked={selectedDays[day]} value={day} onChange={onDaySelected} className='capitalize'>
                  {day}
                </Checkbox>
              </Col>
            )
          })}
        </Row>
      </Checkbox.Group>

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
          {tempRanges.map((range, index) => {
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
                {index !== 0 && (
                  <AppButton
                    size='large'
                    danger
                    icon={<MinusCircleFilled />}
                    type='text'
                    onClick={() => onRemoveRangeClick(index)}
                  />
                )}
              </Flex>
            )
          })}
          <AppButton
            icon={<PlusOutlined />}
            type='link'
            onClick={onAddRangeClick}
            className='text-left! w-fit'
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
              const daySchedule = formik.values.weekSchedule[day as WeekDay]
              if (daySchedule.length === 0) return null
              return (
                <Flex key={day} gap={4}>
                  <Typography.Text className='capitalize'>{day}: </Typography.Text>
                  <Typography.Text>
                    {daySchedule.map((range) => `${range.start} - ${range.end}`).join(', ')}
                  </Typography.Text>
                </Flex>
              )
            })}
          </Flex>
        </Flex>
      )}
    </Flex>
  )
}

export default ProviderProfileWeekSchedule
