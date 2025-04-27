import { ROUTES } from '@constants/routes'

export type AppRouteName = keyof typeof ROUTES
export type AppRoutePath = (typeof ROUTES)[AppRouteName]
