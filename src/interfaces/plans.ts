import { PLANS } from '@constants/plans'

export type Plan = (typeof PLANS)[keyof typeof PLANS]
