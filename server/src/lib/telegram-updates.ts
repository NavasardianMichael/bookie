import { timingSafeEqual } from 'node:crypto'

/**
 * Reading what the Telegram bot receives — pure, so `tests/unit/server/telegram.spec.ts`
 * reaches it. The webhook (`routes/telegram.ts`) acts on two commands and ignores the rest:
 *
 * - `/start <token>` — sent by Telegram when someone opens our Connect deep link
 *   (`t.me/<bot>?start=<token>`) and presses Start. The token names the account to link.
 * - `/stop` — disconnect this chat.
 */
export type TelegramCommand =
  | { kind: 'start'; chatId: string; token?: string; username?: string }
  | { kind: 'stop'; chatId: string }
  | { kind: 'other'; chatId: string }

/** What `mintTelegramLinkToken` produces, and nothing a typist could reach by accident. */
const LINK_TOKEN = /^[A-Za-z0-9_-]{16,64}$/

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined

/**
 * The command in an update, or null for anything that is not a text message in a private
 * chat (a group the bot was added to, an edited message, a callback). Chat ids are numbers
 * that can exceed 32 bits; they are kept as strings end to end.
 */
export const parseTelegramUpdate = (body: unknown): TelegramCommand | null => {
  const message = asRecord(asRecord(body)?.message)
  const chat = asRecord(message?.chat)
  if (!message || !chat || chat.type !== 'private') return null

  const rawId = chat.id
  if (typeof rawId !== 'number' && typeof rawId !== 'string') return null
  const chatId = String(rawId)

  const text = typeof message.text === 'string' ? message.text.trim() : ''
  // `/start@BookieBot payload` is how a command reads when addressed to the bot by name.
  const [command = '', payload] = text.split(/\s+/, 2)
  const name = command.split('@')[0]?.toLowerCase()

  if (name === '/start') {
    const username = asRecord(message.from)?.username
    return {
      kind: 'start',
      chatId,
      token: payload && LINK_TOKEN.test(payload) ? payload : undefined,
      username: typeof username === 'string' && username ? username : undefined,
    }
  }
  if (name === '/stop') return { kind: 'stop', chatId }
  return { kind: 'other', chatId }
}

/**
 * Whether an update came from Telegram: `setWebhook`'s `secret_token` is echoed in the
 * `X-Telegram-Bot-Api-Secret-Token` header of every delivery. An empty secret matches
 * nothing — an unconfigured bot must not accept updates from anyone.
 */
export const telegramSecretMatches = (header: string | undefined, secret: string): boolean => {
  if (!secret || !header) return false
  const a = Buffer.from(header, 'utf8')
  const b = Buffer.from(secret, 'utf8')
  return a.length === b.length && timingSafeEqual(a, b)
}
