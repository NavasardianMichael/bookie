'use client'

import { FC } from 'react'
import { Segmented } from 'antd'
import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import { useTranslations } from 'next-intl'
import { TimeFormat } from '@interfaces/schedule'
import { SCHEDULE_VALUE_FORMAT, TIME_FORMATS, TIME_FORMATS_LIST } from '@constants/schedule'
import { getTimeDisplayFormat } from '@helpers/timeFormat'

dayjs.extend(customParseFormat)

type Props = {
  /** Injected by the wrapping `Form.Item`. */
  value?: TimeFormat
  onChange?: (next: TimeFormat) => void
}

/** 21:30 on each clock, so the choice is shown rather than described. */
const SAMPLE_TIME = dayjs('21:30', SCHEDULE_VALUE_FORMAT)

/**
 * 12- or 24-hour. `value` and `onChange` are injected by `Form.Item` (the `forms` skill's
 * control contract), which is why this is a component rather than a bare `Segmented`.
 * The Advanced settings tab and the profile assistant's review both render it.
 */
export const TimeFormatToggle: FC<Props> = ({ value, onChange }) => {
  const t = useTranslations('Settings')

  return (
    <Segmented<TimeFormat>
      value={value}
      onChange={onChange}
      options={TIME_FORMATS_LIST.map((format) => ({
        value: format,
        label: t(format === TIME_FORMATS.h24 ? 'availability.timeFormat24' : 'availability.timeFormat12', {
          time: SAMPLE_TIME.format(getTimeDisplayFormat(format)),
        }),
      }))}
    />
  )
}
