'use client'

import { FC } from 'react'
import { MinusCircleFilled, PlusOutlined } from '@ant-design/icons'
import { Flex, TimePicker, Typography } from 'antd'
import { RangePickerProps } from 'antd/es/date-picker'
import { useTranslations } from 'next-intl'
import { TimeFormat } from '@interfaces/schedule'
import { TIME_FORMATS } from '@constants/schedule'
import { AppButton } from '@components/ui/AppButton'

type Props = {
  selectedDays: string[]
  timeFormat: TimeFormat
  timeDisplayFormat: string
  availability: RangePickerProps['value']
  breaks: RangePickerProps['value'][]
  changesComplete: boolean
  onAvailabilityChange: RangePickerProps['onChange']
  onBreakChange: (
    dates: Parameters<NonNullable<RangePickerProps['onChange']>>[0],
    dateStrings: Parameters<NonNullable<RangePickerProps['onChange']>>[1],
    index: number
  ) => void
  onRemoveBreak: (index: number) => void
  onAddBreak: () => void
  onCancel: () => void
  onConfirm: () => void
}

/**
 * The TimePicker body of the week-schedule sheet. Split out so the profile form
 * does not download TimePicker until Edit Schedule opens.
 */
export const WeekScheduleEditor: FC<Props> = ({
  selectedDays,
  timeFormat,
  timeDisplayFormat,
  availability,
  breaks,
  changesComplete,
  onAvailabilityChange,
  onBreakChange,
  onRemoveBreak,
  onAddBreak,
  onCancel,
  onConfirm,
}) => {
  const tDays = useTranslations('Settings.availability.days')
  const tCommon = useTranslations('Common')
  const t = useTranslations('ProfileCreation')

  return (
    <Flex vertical gap={8}>
      <Typography.Paragraph>
        for{' '}
        {selectedDays.map((day, i, arr) => (
          <Typography.Text key={day}>
            {tDays(day)}
            {i < arr.length - 1 ? ', ' : ''}
          </Typography.Text>
        ))}
      </Typography.Paragraph>
      <TimePicker.RangePicker
        className='grow'
        use12Hours={timeFormat === TIME_FORMATS.h12}
        showNow
        value={availability}
        format={timeDisplayFormat}
        onChange={onAvailabilityChange}
        minuteStep={5}
        separator='-'
      />
      {breaks.length > 0 && (
        <Typography.Paragraph className='mt-4 mb-0 text-lg font-semibold'>Breaks</Typography.Paragraph>
      )}
      {breaks.map((range, index) => {
        return (
          <Flex gap={8} key={index} align='center'>
            <TimePicker.RangePicker
              className='grow'
              use12Hours={timeFormat === TIME_FORMATS.h12}
              showNow
              value={range}
              format={timeDisplayFormat}
              onChange={(dates, dateStrings) => onBreakChange(dates, dateStrings, index)}
              minuteStep={5}
              separator='-'
            />
            <AppButton
              danger
              icon={<MinusCircleFilled />}
              type='text'
              aria-label={t('removeBreak', { n: index + 1 })}
              className='min-h-11 min-w-11'
              onClick={() => onRemoveBreak(index)}
            />
          </Flex>
        )
      })}
      <AppButton
        icon={<PlusOutlined />}
        type='link'
        onClick={onAddBreak}
        className='mt-0 w-fit text-left text-xs'
        size='small'
      >
        Add break
      </AppButton>
      <Flex gap={8} justify='end' className='mt-4'>
        <AppButton onClick={onCancel}>{tCommon('cancel')}</AppButton>
        <AppButton type='primary' disabled={!changesComplete} onClick={onConfirm}>
          {tCommon('confirm')}
        </AppButton>
      </Flex>
    </Flex>
  )
}
