import {
  ApplyProfileAssistantAPI,
  DismissProfileAssistantAPI,
  GenerateProfileAssistantAPI,
  GetProfileAssistantStatusAPI,
} from './types'

export const processGetProfileAssistantStatusResponse: GetProfileAssistantStatusAPI['processor'] = (response) =>
  response.value

export const processGenerateProfileAssistantResponse: GenerateProfileAssistantAPI['processor'] = (response) =>
  response.value.proposal

export const processApplyProfileAssistantResponse: ApplyProfileAssistantAPI['processor'] = (response) =>
  response.value === true

export const processDismissProfileAssistantResponse: DismissProfileAssistantAPI['processor'] = (response) =>
  response.value === true
