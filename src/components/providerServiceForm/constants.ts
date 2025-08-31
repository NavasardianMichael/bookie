import { SelectProps } from 'antd'
import { CURRENCY_IDS, CURRENCY_NAMES } from '@constants/currencies'

export const PROVIDER_SERVICE_FORM_CURRENCY_TEMPLATE: SelectProps['options'] = [
  { value: CURRENCY_IDS.usd, label: CURRENCY_NAMES.usd },
  { value: CURRENCY_IDS.eur, label: CURRENCY_NAMES.eur },
  { value: CURRENCY_IDS.gbp, label: CURRENCY_NAMES.gbp },
  { value: CURRENCY_IDS.jpy, label: CURRENCY_NAMES.jpy },
  { value: CURRENCY_IDS.aud, label: CURRENCY_NAMES.aud },
  { value: CURRENCY_IDS.cad, label: CURRENCY_NAMES.cad },
  { value: CURRENCY_IDS.chf, label: CURRENCY_NAMES.chf },
  { value: CURRENCY_IDS.cny, label: CURRENCY_NAMES.cny },
  { value: CURRENCY_IDS.amd, label: CURRENCY_NAMES.amd },
  { value: CURRENCY_IDS.rub, label: CURRENCY_NAMES.rub },
]
