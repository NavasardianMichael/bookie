import { DeleteTelegramLinkAPI, GetTelegramStatusAPI, PostTelegramLinkAPI } from './types'

export const processTelegramStatusResponse: GetTelegramStatusAPI['processor'] = (response) => response.value

export const processTelegramLinkResponse: PostTelegramLinkAPI['processor'] = (response) => response.value.url

export const processTelegramUnlinkResponse: DeleteTelegramLinkAPI['processor'] = (response) => response.value
