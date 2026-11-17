import { FC } from 'react'
import { GoogleAnalytics } from '@next/third-parties/google'
import { GA_MEASUREMENT_ID } from '@constants/monitoring'

/** The GA4 tag, loaded after the page is interactive. Nothing while the Measurement ID is unset. */
export const Analytics: FC = () => (GA_MEASUREMENT_ID ? <GoogleAnalytics gaId={GA_MEASUREMENT_ID} /> : null)
