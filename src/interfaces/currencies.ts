import { CURRENCY_IDS } from '@constants/currencies'

export type CurrencyId = (typeof CURRENCY_IDS)[keyof typeof CURRENCY_IDS]
