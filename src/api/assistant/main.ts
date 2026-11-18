import { axiosInstance } from '@api/axiosInstance'
import { APIResponse } from '@interfaces/api'
import { createSseParser, StreamFailure, toStreamError } from '@helpers/sse'
import { ENDPOINTS } from './endpoints'
import {
  processDeleteAssistantConversationResponse,
  processGetAssistantConversationResponse,
  processGetAssistantResponse,
  processPatchAssistantMessageResponse,
  processPostAssistantPhotoResponse,
  processPutVisitorAssistantResponse,
} from './processors'
import {
  AssistantConversation,
  AssistantMessage,
  AssistantUsage,
  DeleteAssistantConversationAPI,
  GetAssistantAPI,
  GetAssistantConversationAPI,
  PatchAssistantMessageAPI,
  PostAssistantPhotoAPI,
  PutVisitorAssistantAPI,
  SendAssistantMessageHandlers,
  VisitorAssistantTurn,
} from './types'

export const getAssistantAPI: GetAssistantAPI['api'] = async () => {
  const { data } = await axiosInstance.get<APIResponse<GetAssistantAPI['response']>>(ENDPOINTS.getAssistant)
  return processGetAssistantResponse(data)
}

export const postAssistantPhotoAPI: PostAssistantPhotoAPI['api'] = async (payload) => {
  const { data } = await axiosInstance.post<APIResponse<PostAssistantPhotoAPI['response']>>(
    ENDPOINTS.postAssistantPhoto,
    payload
  )
  return processPostAssistantPhotoResponse(data)
}

export const patchAssistantMessageAPI: PatchAssistantMessageAPI['api'] = async ({ id, ...body }) => {
  const { data } = await axiosInstance.patch<APIResponse<PatchAssistantMessageAPI['response']>>(
    `${ENDPOINTS.patchAssistantMessage}/${id}`,
    body
  )
  return processPatchAssistantMessageResponse(data)
}

export const getAssistantConversationAPI: GetAssistantConversationAPI['api'] = async ({ id }) => {
  const { data } = await axiosInstance.get<APIResponse<GetAssistantConversationAPI['response']>>(
    `${ENDPOINTS.getAssistantConversation}/${id}`
  )
  return processGetAssistantConversationResponse(data)
}

export const deleteAssistantConversationAPI: DeleteAssistantConversationAPI['api'] = async ({ id }) => {
  const { data } = await axiosInstance.delete<APIResponse<DeleteAssistantConversationAPI['response']>>(
    `${ENDPOINTS.deleteAssistantConversation}/${id}`
  )
  return processDeleteAssistantConversationResponse(data)
}

export const putVisitorAssistantAPI: PutVisitorAssistantAPI['api'] = async (payload) => {
  const { data } = await axiosInstance.put<APIResponse<PutVisitorAssistantAPI['response']>>(
    ENDPOINTS.putVisitorAssistant,
    payload
  )
  return processPutVisitorAssistantResponse(data)
}

/**
 * A refused stream's JSON envelope. A body that is not JSON (an nginx error page) is not an
 * error of its own: the failure is then classified by its status alone, as `classifyError`
 * does for any HTTP response without our envelope.
 */
const readEnvelope = async (response: Response): Promise<StreamFailure | null> => {
  try {
    return (await response.json()) as StreamFailure
  } catch {
    return null
  }
}

/**
 * POSTs JSON and reads the answer as server-sent events, calling `onEvent` for each. `fetch`,
 * not axios: axios cannot hand a browser a body as it arrives. Same base URL, cookies and
 * origin as `axiosInstance`. Every failure rejects with an `AxiosError` (`toStreamError`) — a
 * refusal before the stream (a JSON envelope with its status), an `error` event during it, a
 * dropped connection — so the error pipeline treats it like any other call. A cancel through
 * `signal` resolves quietly.
 */
const streamPost = async (
  path: string,
  body: unknown,
  onEvent: (event: string, data: unknown) => void,
  signal?: AbortSignal
): Promise<void> => {
  const request = { method: 'POST', url: path }
  let response: Response
  try {
    response = await fetch(`${axiosInstance.defaults.baseURL ?? ''}${path}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
      body: JSON.stringify(body),
      signal,
    })
  } catch (error) {
    if (signal?.aborted) return
    throw toStreamError({ value: null, error: { code: -1, message: String(error) } }, request, 0)
  }

  if (!response.ok || !response.body) {
    const envelope = await readEnvelope(response)
    const retryAfter = Number(response.headers.get('retry-after'))
    throw toStreamError(
      {
        value: null,
        error: envelope?.error ?? { code: response.status, message: response.statusText },
        retryAfterSeconds: Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined,
      },
      request,
      response.status
    )
  }

  const parse = createSseParser()
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
  try {
    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      for (const { event, data } of parse(value)) {
        if (event === 'error') throw toStreamError(data as StreamFailure, request)
        onEvent(event, data)
      }
    }
  } catch (error) {
    if (signal?.aborted) return
    if (error instanceof Error && error.name === 'AxiosError') throw error
    throw toStreamError({ value: null, error: { code: -1, message: String(error) } }, request, 0)
  } finally {
    reader.releaseLock()
  }
}

/**
 * The provider's message to their assistant, the reply streamed through `handlers`. In the chat
 * `conversationId` names; `null` starts a new one, which `onStart` reports.
 */
export const sendAssistantMessageAPI = (
  text: string,
  conversationId: string | null,
  handlers: SendAssistantMessageHandlers,
  signal?: AbortSignal
): Promise<void> =>
  streamPost(
    ENDPOINTS.sendAssistantMessage,
    { text, ...(conversationId ? { conversationId } : {}) },
    (event, data) => {
      const payload = data as {
        message?: AssistantMessage
        conversation?: AssistantConversation
        text?: string
        dropped?: number
        usage?: AssistantUsage
      }
      if (event === 'start' && payload.message && payload.conversation) {
        handlers.onStart(payload.message, payload.conversation)
      } else if (event === 'text' && typeof payload.text === 'string') handlers.onText(payload.text)
      else if (event === 'done' && payload.message && payload.usage && payload.conversation) {
        handlers.onDone({
          message: payload.message,
          dropped: payload.dropped ?? 0,
          usage: payload.usage,
          conversation: payload.conversation,
        })
      }
    },
    signal
  )

/** A visitor's question to a public page's assistant, with the conversation so far; text streamed. */
export const sendVisitorAssistantMessageAPI = (
  providerId: string,
  messages: VisitorAssistantTurn[],
  onText: (text: string) => void,
  signal?: AbortSignal
): Promise<void> =>
  streamPost(
    `${ENDPOINTS.sendVisitorAssistantMessage}/${providerId}/assistant`,
    { messages },
    (event, data) => {
      const text = (data as { text?: unknown }).text
      if (event === 'text' && typeof text === 'string') onText(text)
    },
    signal
  )
