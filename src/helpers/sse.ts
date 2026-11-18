import { AxiosError, AxiosHeaders, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { APIResponse } from '@interfaces/api'

/**
 * Reading a streamed answer — the two AI assistants' replies, sent as server-sent events by
 * `server/src/lib/sse.ts`. axios cannot hand a browser the body as it arrives, so these calls
 * use `fetch` (`src/api/assistant/main.ts`); this module is the pure half.
 *
 * A failure — refused up front with a JSON envelope, or an `error` event once the stream had
 * begun — becomes an **`AxiosError`** shaped like any other failed call (`toStreamError`), so
 * `classifyError`, `processError`, the error copy by code and Retry all work unchanged.
 */

export type SseEvent = { event: string; data: unknown }

/**
 * A stateful parser: feed it text as it arrives and it returns each complete event. Events end
 * at a blank line; `\r\n` is accepted. Unparseable `data` is passed through as the raw string.
 */
export const createSseParser = (): ((chunk: string) => SseEvent[]) => {
  let buffer = ''
  return (chunk) => {
    buffer = `${buffer}${chunk}`.replace(/\r\n/g, '\n')
    const blocks = buffer.split('\n\n')
    buffer = blocks.pop() ?? ''
    return blocks.flatMap((block): SseEvent[] => {
      let event = 'message'
      const data: string[] = []
      for (const line of block.split('\n')) {
        if (line.startsWith('event:')) event = line.slice(6).trim()
        else if (line.startsWith('data:')) data.push(line.slice(5).trimStart())
      }
      if (!data.length) return []
      const raw = data.join('\n')
      try {
        return [{ event, data: JSON.parse(raw) as unknown }]
      } catch {
        return [{ event, data: raw }]
      }
    })
  }
}

/** What a stream's `error` event carries: the envelope, the status it would have had, the wait. */
export type StreamFailure = APIResponse<null> & { status?: number; retryAfterSeconds?: number }

/**
 * A streamed call's failure as the `AxiosError` the rest of the app already understands. The
 * message follows `axiosInstance`'s `[status] METHOD path — message` so development details
 * name the call, exactly as for an axios request.
 */
export const toStreamError = (
  failure: StreamFailure,
  request: { method: string; url: string },
  status = failure.status ?? 500
): AxiosError => {
  const config = { method: request.method.toLowerCase(), url: request.url, headers: new AxiosHeaders() } as InternalAxiosRequestConfig
  const headers = failure.retryAfterSeconds ? { 'retry-after': String(failure.retryAfterSeconds) } : {}
  const response = {
    status,
    statusText: '',
    data: { value: null, error: failure.error },
    headers,
    config,
  } as AxiosResponse
  const message = `[${status}] ${request.method.toUpperCase()} ${request.url} — ${failure.error?.message ?? 'stream failed'}`
  return new AxiosError(message, undefined, config, undefined, response)
}
