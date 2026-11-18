import { useCallback, useEffect, useRef, useState } from 'react'
import { sendVisitorAssistantMessageAPI } from '@api/assistant/main'
import { VisitorAssistantTurn } from '@api/assistant/types'
import { VISITOR_ASSISTANT_STORAGE_PREFIX, VISITOR_TURNS_MAX } from '@constants/assistant'
import { reportError } from '@helpers/reportError'

/** Turns kept in the browser — the server reads only the last `VISITOR_TURNS_MAX`, the visitor scrolls the rest. */
const KEPT_TURNS = 40

/**
 * How long a conversation outlives its last answer. localStorage keeps it across visits, so on a
 * shared computer the next person would read it; a month is "come back later", not "forever".
 */
const KEPT_FOR_MS = 30 * 24 * 60 * 60 * 1000

type Stored = { savedAt: number; turns: unknown }

const read = (key: string): VisitorAssistantTurn[] => {
  try {
    const raw = window.localStorage.getItem(key)
    const stored = (raw ? JSON.parse(raw) : null) as Stored | null
    if (!stored || typeof stored.savedAt !== 'number' || Date.now() - stored.savedAt > KEPT_FOR_MS) {
      if (raw) window.localStorage.removeItem(key)
      return []
    }
    const parsed = stored.turns
    return Array.isArray(parsed)
      ? parsed.filter(
          (turn): turn is VisitorAssistantTurn =>
            typeof turn === 'object' &&
            turn !== null &&
            ((turn as VisitorAssistantTurn).role === 'user' || (turn as VisitorAssistantTurn).role === 'model') &&
            typeof (turn as VisitorAssistantTurn).text === 'string'
        )
      : []
  } catch {
    // Storage blocked (private mode, an iframe): the chat still works, it just forgets.
    return []
  }
}

const write = (key: string, turns: VisitorAssistantTurn[]): void => {
  try {
    if (!turns.length) {
      window.localStorage.removeItem(key)
      return
    }
    const stored: Stored = { savedAt: Date.now(), turns: turns.slice(-KEPT_TURNS) }
    window.localStorage.setItem(key, JSON.stringify(stored))
  } catch (error) {
    reportError(error, 'VisitorAssistant:store')
  }
}

/**
 * A visitor's conversation with one provider page's assistant. Kept in **localStorage**, per
 * page — it is still there when the visitor comes back in this browser, for 30 days after the
 * last answer, until **Start over**; nothing is stored on our side. Each question goes up with
 * the conversation so far (the server keeps none of it).
 */
export type VisitorAssistantChat = {
  turns: VisitorAssistantTurn[]
  /** The answer being written, as it arrives; `null` when none is. */
  streaming: string | null
  error: unknown
  /** Resolves `true` once answered; `false` on a failure, which `error` holds. */
  send: (text: string) => Promise<boolean>
  clear: () => void
}

export const useVisitorAssistantChat = (providerId: string, enabled: boolean): VisitorAssistantChat => {
  const key = `${VISITOR_ASSISTANT_STORAGE_PREFIX}${providerId}`
  const [turns, setTurns] = useState<VisitorAssistantTurn[]>([])
  const [streaming, setStreaming] = useState<string | null>(null)
  const [error, setError] = useState<unknown>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Read when the sheet first opens. `enabled` is false through the server pass and hydration
  // (the sheet opens on a click), so reading storage here never makes the two disagree.
  const [loadedKey, setLoadedKey] = useState<string | null>(null)
  if (enabled && loadedKey !== key) {
    setLoadedKey(key)
    setTurns(read(key))
  }

  useEffect(() => () => abortRef.current?.abort(), [])

  const send = useCallback(
    async (text: string): Promise<boolean> => {
      const asked: VisitorAssistantTurn[] = [...turns, { role: 'user', text }]
      setTurns(asked)
      setError(null)
      setStreaming('')
      const controller = new AbortController()
      abortRef.current = controller
      let answer = ''
      try {
        await sendVisitorAssistantMessageAPI(
          providerId,
          asked.slice(-VISITOR_TURNS_MAX),
          (chunk) => {
            answer += chunk
            setStreaming(answer)
          },
          controller.signal
        )
        const next: VisitorAssistantTurn[] = [...asked, { role: 'model', text: answer }]
        setTurns(next)
        write(key, next)
        return true
      } catch (failure) {
        // The question stays in the box to ask again, not in the conversation.
        setTurns(turns)
        setError(failure)
        return false
      } finally {
        setStreaming(null)
        abortRef.current = null
      }
    },
    [key, providerId, turns]
  )

  const clear = useCallback(() => {
    setTurns([])
    write(key, [])
  }, [key])

  return { turns, streaming, error, send, clear }
}
