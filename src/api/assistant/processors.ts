import {
  AssistantMessage,
  DeleteAssistantConversationAPI,
  GetAssistantAPI,
  GetAssistantConversationAPI,
  PatchAssistantMessageAPI,
  PostAssistantPhotoAPI,
  PutVisitorAssistantAPI,
} from './types'

/** A payload without the key reads as the assistant being off — never as a crash. */
export const processGetAssistantResponse: GetAssistantAPI['processor'] = (response) => ({
  available: response.value?.available ?? false,
  included: response.value?.included ?? false,
  usage: response.value?.usage ?? { used: 0, limit: 0 },
  conversations: response.value?.conversations ?? [],
  visitor: response.value?.visitor ?? { allowed: false, enabled: false },
})

export const processGetAssistantConversationResponse: GetAssistantConversationAPI['processor'] = (response) => ({
  conversation: response.value!.conversation,
  messages: response.value?.messages ?? [],
})

export const processPostAssistantPhotoResponse: PostAssistantPhotoAPI['processor'] = (response) => ({
  conversation: response.value!.conversation,
  messages: response.value?.messages ?? [],
})

export const processPatchAssistantMessageResponse: PatchAssistantMessageAPI['processor'] = (response) =>
  response.value as AssistantMessage

export const processDeleteAssistantConversationResponse: DeleteAssistantConversationAPI['processor'] = () => undefined

export const processPutVisitorAssistantResponse: PutVisitorAssistantAPI['processor'] = (response) =>
  response.value ?? { allowed: false, enabled: false }
