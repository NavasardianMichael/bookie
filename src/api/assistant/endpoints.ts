export const ENDPOINTS = {
  getAssistant: '/provider-profile/assistant',
  /** Streamed (server-sent events). */
  sendAssistantMessage: '/provider-profile/assistant/messages',
  postAssistantPhoto: '/provider-profile/assistant/photo',
  /** The message id is interpolated in `main.ts`. */
  patchAssistantMessage: '/provider-profile/assistant/messages',
  /** The chat id is interpolated in `main.ts`. */
  getAssistantConversation: '/provider-profile/assistant/conversations',
  /** The chat id is interpolated in `main.ts`. */
  deleteAssistantConversation: '/provider-profile/assistant/conversations',
  putVisitorAssistant: '/provider-profile/assistant/visitor',
  /** `/providers/:id/assistant` — the id is interpolated in `main.ts`. Streamed. */
  sendVisitorAssistantMessage: '/providers',
} as const
