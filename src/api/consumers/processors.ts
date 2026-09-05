import { GetConsumerProfileAPI, PutConsumerProfileAPI } from './types'

export const processConsumerProfileResponse: GetConsumerProfileAPI['processor'] = (response) => response.value

export const processPutConsumerProfileResponse: PutConsumerProfileAPI['processor'] = (response) => response.value
