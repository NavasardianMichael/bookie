import { useCallback, useEffect, useRef, useState } from 'react'
import {
  deleteAssistantConversationAPI,
  getAssistantAPI,
  getAssistantConversationAPI,
  patchAssistantMessageAPI,
  postAssistantPhotoAPI,
  sendAssistantMessageAPI,
} from '@api/assistant/main'
import {
  AssistantConversation,
  AssistantMessage,
  AssistantState,
  PatchAssistantMessageAPI,
} from '@api/assistant/types'
import { BookingDraft } from '@api/bookingImport/types'

export type AssistantChat = {
  /** Availability, plan, usage and the chat list (newest activity first). */
  state: AssistantState | null
  loadError: unknown
  reload: () => void
  /** The open chat; `null` is a new one, which the next message starts. */
  activeId: string | null
  /** The open chat's messages, oldest first. */
  messages: AssistantMessage[]
  /** The open chat's messages are being read. */
  loadingMessages: boolean
  messagesError: unknown
  /** Opens one of the chats. */
  select: (id: string) => void
  /** Opens an empty chat; nothing is stored until its first message. */
  startNew: () => void
  /** Deletes a chat; deleting the open one opens a new, empty one. */
  remove: (id: string) => Promise<void>
  /** The reply being written, as it arrives; `null` when none is. */
  streaming: string | null
  sending: boolean
  /** The last send's failure, shown under the conversation until the next send. */
  sendError: unknown
  /** How many proposed changes the last reply could not offer (unknown service, past date…). */
  dropped: number
  /** Resolves `true` once the reply is stored; `false` on a failure, which `sendError` holds. */
  send: (text: string) => Promise<boolean>
  /** Puts a photo import's read into the open chat (or a new one) as a turn to review. */
  addPhotoRead: (note: string | undefined, drafts: BookingDraft[]) => Promise<void>
  /** Records what became of a proposal; the chat updates from the stored answer. */
  report: (payload: PatchAssistantMessageAPI['payload']) => Promise<void>
  cancel: () => void
}

/**
 * The provider assistant's chats, for the panel that shows them: the list (read when `enabled`
 * turns on — the newest chat opens unless the provider already picked one), the open chat's
 * messages, the reply streaming in, and the writes that keep the stored history the truth.
 * Everything comes from the server; nothing here is kept in the browser.
 */
export const useAssistantChat = (enabled: boolean): AssistantChat => {
  const [state, setState] = useState<AssistantState | null>(null)
  const [loadError, setLoadError] = useState<unknown>(null)
  const [attempt, setAttempt] = useState(0)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<AssistantMessage[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [messagesError, setMessagesError] = useState<unknown>(null)
  const [streaming, setStreaming] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<unknown>(null)
  const [dropped, setDropped] = useState(0)
  const abortRef = useRef<AbortController | null>(null)
  /** The open chat, for callbacks that outlive a render (a stream, a read in flight). */
  const activeRef = useRef<string | null>(null)
  /** The provider opened a chat or a new one themselves — a reload keeps their choice. */
  const chosenRef = useRef(false)
  /** Only the newest read of a chat's messages may land. */
  const readRef = useRef(0)

  const open = useCallback((id: string) => {
    activeRef.current = id
    setActiveId(id)
    setMessages([])
    setMessagesError(null)
    setLoadingMessages(true)
    setSendError(null)
    setDropped(0)
    const ticket = ++readRef.current
    void getAssistantConversationAPI({ id })
      .then((content) => {
        if (ticket === readRef.current) setMessages(content.messages)
      })
      .catch((error: unknown) => {
        if (ticket === readRef.current) setMessagesError(error)
      })
      .finally(() => {
        if (ticket === readRef.current) setLoadingMessages(false)
      })
  }, [])

  const startNew = useCallback(() => {
    chosenRef.current = true
    readRef.current += 1
    activeRef.current = null
    setActiveId(null)
    setMessages([])
    setMessagesError(null)
    setLoadingMessages(false)
    setSendError(null)
    setDropped(0)
  }, [])

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    void getAssistantAPI()
      .then((loaded) => {
        if (cancelled) return
        setState(loaded)
        setLoadError(null)
        const current = activeRef.current
        const listed = (id: string): boolean => loaded.conversations.some((conversation) => conversation.id === id)
        // The open chat is still there: leave it as it is. Gone (deleted, or pruned): start fresh.
        if (current && listed(current)) return
        if (current) {
          startNew()
          return
        }
        const newest = loaded.conversations[0]
        if (!chosenRef.current && newest) open(newest.id)
      })
      .catch((error: unknown) => {
        if (!cancelled) setLoadError(error)
      })
    return () => {
      cancelled = true
    }
  }, [attempt, enabled, open, startNew])

  // A reply still streaming when the panel unmounts stops spending the quota.
  useEffect(() => () => abortRef.current?.abort(), [])

  const upsertMessages = useCallback((incoming: AssistantMessage[]) => {
    const ids = new Set(incoming.map((message) => message.id))
    setMessages((current) => [...current.filter((message) => !ids.has(message.id)), ...incoming])
  }, [])

  /** A chat with new activity goes to the top of the list. */
  const upsertConversation = useCallback((conversation: AssistantConversation) => {
    setState((current) =>
      current
        ? {
            ...current,
            conversations: [conversation, ...current.conversations.filter((entry) => entry.id !== conversation.id)],
          }
        : current
    )
  }, [])

  const dropConversation = useCallback((id: string) => {
    setState((current) =>
      current ? { ...current, conversations: current.conversations.filter((entry) => entry.id !== id) } : current
    )
  }, [])

  const select = useCallback(
    (id: string) => {
      chosenRef.current = true
      open(id)
    },
    [open]
  )

  const remove = useCallback(
    async (id: string) => {
      await deleteAssistantConversationAPI({ id })
      dropConversation(id)
      if (activeRef.current === id) startNew()
    },
    [dropConversation, startNew]
  )

  const send = useCallback(
    async (text: string) => {
      const conversationId = activeRef.current
      const controller = new AbortController()
      abortRef.current = controller
      setSending(true)
      setSendError(null)
      setDropped(0)
      setStreaming('')
      let startedId: string | null = null
      let startedConversationId: string | null = null
      try {
        await sendAssistantMessageAPI(
          text,
          conversationId,
          {
            onStart: (message, conversation) => {
              startedId = message.id
              if (!conversationId) {
                // The message started a chat: it is the open one from here on.
                startedConversationId = conversation.id
                chosenRef.current = true
                activeRef.current = conversation.id
                setActiveId(conversation.id)
              }
              upsertConversation(conversation)
              upsertMessages([message])
            },
            onText: (chunk) => setStreaming((current) => `${current ?? ''}${chunk}`),
            onDone: ({ message, dropped: left, usage, conversation }) => {
              upsertMessages([message])
              upsertConversation(conversation)
              setDropped(left)
              setState((current) => (current ? { ...current, usage } : current))
            },
          },
          controller.signal
        )
        return true
      } catch (error) {
        // The server dropped the message it stored for this turn — and a chat it started — so
        // the panel follows.
        const dropId = startedId
        if (dropId) setMessages((current) => current.filter((message) => message.id !== dropId))
        if (startedConversationId) {
          dropConversation(startedConversationId)
          activeRef.current = null
          setActiveId(null)
        }
        setSendError(error)
        return false
      } finally {
        setStreaming(null)
        setSending(false)
        abortRef.current = null
      }
    },
    [dropConversation, upsertConversation, upsertMessages]
  )

  const addPhotoRead = useCallback(
    async (note: string | undefined, drafts: BookingDraft[]) => {
      const content = await postAssistantPhotoAPI({ note, drafts, conversationId: activeRef.current ?? undefined })
      if (activeRef.current !== content.conversation.id) {
        chosenRef.current = true
        activeRef.current = content.conversation.id
        setActiveId(content.conversation.id)
      }
      upsertConversation(content.conversation)
      upsertMessages(content.messages)
    },
    [upsertConversation, upsertMessages]
  )

  const report = useCallback(
    async (payload: PatchAssistantMessageAPI['payload']) => {
      upsertMessages([await patchAssistantMessageAPI(payload)])
    },
    [upsertMessages]
  )

  return {
    state,
    loadError,
    reload: () => setAttempt((current) => current + 1),
    activeId,
    messages,
    loadingMessages,
    messagesError,
    select,
    startNew,
    remove,
    streaming,
    sending,
    sendError,
    dropped,
    send,
    addPhotoRead,
    report,
    cancel: () => abortRef.current?.abort(),
  }
}
