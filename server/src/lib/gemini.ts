import { config } from '../config.js'

/**
 * The only client for Google's Gemini API, and the only module that reads `GEMINI_API_KEY` —
 * the rule `lib/mail.ts` and `lib/paddle.ts` keep for their keys. The key travels in the
 * `x-goog-api-key` header, never in the URL, and is never returned, logged, or put in an
 * error; a failed call logs Google's HTTP status and its `error.status` word.
 *
 * Plain `fetch`, not `@google/genai`, for the reason `lib/paddle.ts` gives: one call does not
 * justify an SDK, and the response is narrowed to the fields used. `generateContent` rather
 * than the newer Interactions API because it is stateless — nothing about a provider's
 * clients is stored on Google's side between calls.
 *
 * Built for the **free tier**: one request per photo or description and no retries here. A free key's
 * per-minute quota is small and shared by every provider, so a retry loop would spend it for
 * everyone; a `429` goes back to the caller with Google's suggested wait instead.
 */

/** A photo read takes a few seconds; a slow one is still worth waiting for, a hung one is not. */
const GEMINI_TIMEOUT_MS = 60_000

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta'

/** A Gemini call that did not produce an answer. `message` is ours or Google's — never the key. */
export class GeminiError extends Error {
  constructor(
    message: string,
    /** HTTP status from Google; `0` when no response arrived (unconfigured, network, timeout). */
    public status: number,
    /** True when the request ran out of time rather than failing. */
    public timedOut = false,
    /** Google's suggested wait on a `429`, in seconds. */
    public retryAfterSeconds?: number
  ) {
    super(message)
  }
}

type GeminiErrorBody = {
  error?: { message?: string; status?: string; details?: { '@type'?: string; retryDelay?: string }[] }
}

type GeminiResponse = {
  candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] }; finishReason?: string }[]
  promptFeedback?: { blockReason?: string }
}

/** `"36s"` → 36. Google's `RetryInfo.retryDelay` is a protobuf Duration in JSON form. */
const parseRetryDelay = (body: GeminiErrorBody | null): number | undefined => {
  const delay = body?.error?.details?.find((detail) => detail['@type']?.endsWith('RetryInfo'))?.retryDelay
  const seconds = delay ? Number.parseFloat(delay) : NaN
  return Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds) : undefined
}

export type GenerateJsonInput = {
  systemInstruction: string
  text: string
  /** A photo to read beside `text`. Absent for a text-only call (the profile assistant). */
  image?: { mimeType: string; data: Buffer }
  /** A JSON Schema the answer must follow (`generationConfig.responseJsonSchema`). */
  responseSchema: object
}

/**
 * Instructions (and at most one image) in, the model's JSON answer out — as text, for the caller's own
 * parser to narrow. Throws `GeminiError` for every way of not getting one: unconfigured
 * (`0`), no response (`0`, maybe `timedOut`), Google's refusal (its status), or an answer that
 * was blocked or empty (`422`).
 */
export const generateJson = async (input: GenerateJsonInput): Promise<string> => {
  if (!config.gemini.apiKey) throw new GeminiError('Gemini is not configured', 0)

  let response: Response
  try {
    response = await fetch(`${API_BASE}/models/${encodeURIComponent(config.gemini.model)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': config.gemini.apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: input.systemInstruction }] },
        contents: [
          {
            role: 'user',
            // The image first, then the words about it — Google's order for a single image.
            parts: [
              ...(input.image
                ? [{ inline_data: { mime_type: input.image.mimeType, data: input.image.data.toString('base64') } }]
                : []),
              { text: input.text },
            ],
          },
        ],
        // No `maxOutputTokens`: on thinking models the cap also spends on the model's own
        // reasoning, so a tight one truncates a dense page into "no answer". The schema's
        // `maxItems` is what bounds the answer.
        generationConfig: {
          responseMimeType: 'application/json',
          responseJsonSchema: input.responseSchema,
        },
      }),
      signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
    })
  } catch (err) {
    const timedOut = err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError')
    const message = err instanceof Error ? err.message : 'Gemini request failed'
    console.error(`[gemini] generateContent did not complete: ${message}`)
    throw new GeminiError(message, 0, timedOut)
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as GeminiErrorBody | null
    // Status and Google's status word — never the request, whose header carries the key.
    console.error(`[gemini] generateContent failed: ${response.status} ${body?.error?.status ?? ''} (${config.gemini.model})`)
    throw new GeminiError(
      body?.error?.message ?? `Gemini responded ${response.status}`,
      response.status,
      false,
      response.status === 429 ? parseRetryDelay(body) : undefined
    )
  }

  const parsed = (await response.json().catch(() => null)) as GeminiResponse | null
  const blockReason = parsed?.promptFeedback?.blockReason
  const text = (parsed?.candidates?.[0]?.content?.parts ?? [])
    .filter((part) => !part.thought && typeof part.text === 'string')
    .map((part) => part.text)
    .join('')
    .trim()

  if (blockReason || !text) {
    const why = blockReason ?? parsed?.candidates?.[0]?.finishReason ?? 'empty'
    console.error(`[gemini] generateContent returned no answer: ${why} (${config.gemini.model})`)
    throw new GeminiError(`No answer (${why})`, 422)
  }

  return text
}
