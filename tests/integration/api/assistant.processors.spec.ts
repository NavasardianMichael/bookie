import { describe, expect, it } from 'vitest'
import {
  processGetAssistantConversationResponse,
  processGetAssistantResponse,
  processPostAssistantPhotoResponse,
} from '@api/assistant/processors'
import { AssistantConversation, AssistantMessage, AssistantState } from '@api/assistant/types'
import { APIResponse } from '@interfaces/api'

const envelope = <T>(value: T): APIResponse<T> => ({ value, error: null })

const conversation: AssistantConversation = {
  id: 'c1',
  title: 'Closed tomorrow',
  createdAt: '2026-11-18T10:00:00.000Z',
  updatedAt: '2026-11-18T10:05:00.000Z',
}

const message: AssistantMessage = {
  id: 'm1',
  role: 'user',
  text: 'Closed tomorrow',
  proposal: null,
  proposalStatus: null,
  outcome: null,
  createdAt: '2026-11-18T10:00:00.000Z',
}

describe('processGetAssistantResponse', () => {
  it('passes the chat list through, newest first as the server sent it', () => {
    const state: AssistantState = {
      available: true,
      included: true,
      usage: { used: 2, limit: 40 },
      conversations: [conversation],
      visitor: { allowed: false, enabled: false },
    }
    expect(processGetAssistantResponse(envelope(state))).toEqual(state)
  })

  // A payload from before the chats existed, or a half-empty one, reads as "off" with no chats.
  it('reads a payload without the keys as the assistant being off', () => {
    expect(processGetAssistantResponse(envelope(null as unknown as AssistantState))).toEqual({
      available: false,
      included: false,
      usage: { used: 0, limit: 0 },
      conversations: [],
      visitor: { allowed: false, enabled: false },
    })
  })
})

describe('one chat and a photo read', () => {
  it('keep the chat beside its messages', () => {
    expect(processGetAssistantConversationResponse(envelope({ conversation, messages: [message] }))).toEqual({
      conversation,
      messages: [message],
    })
    expect(processPostAssistantPhotoResponse(envelope({ conversation, messages: [message] }))).toEqual({
      conversation,
      messages: [message],
    })
  })
})
