import { GetCalendarFeedAPI, RotateCalendarFeedAPI } from './types'

export const processCalendarFeedResponse: GetCalendarFeedAPI['processor'] = (response) => response.value.url

export const processRotateCalendarFeedResponse: RotateCalendarFeedAPI['processor'] = (response) => response.value.url
