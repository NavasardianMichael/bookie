import { config, isTelegramConfigured } from '../config.js'

/**
 * The only client for the Telegram Bot API, and the only module that reads
 * `TELEGRAM_BOT_TOKEN` — the rule `lib/mail.ts` keeps for the mail key. The token is part of
 * every request *URL*, so a failure logs Telegram's description and status, never the URL.
 *
 * Transport only: who gets a message, and whether their plan allows it, is
 * `services/notify.ts`. See docs/NOTIFICATIONS.md for setting the bot up.
 */

const TELEGRAM_TIMEOUT_MS = 10_000

export type TelegramResult =
  | { ok: true }
  /** `blocked`: the person stopped the bot or deleted the chat — the link is dead. */
  | { ok: false; blocked: boolean; message: string }

type TelegramResponse = { ok?: boolean; description?: string; error_code?: number }

/**
 * Send one message. `html` is already in Telegram's HTML subset with every user-authored
 * string escaped (`lib/notice-render.ts`). Link previews are off: the only links are ours,
 * and a preview card of the booking page under every reminder is noise.
 */
export const sendTelegramMessage = async (chatId: string, html: string): Promise<TelegramResult> => {
  if (!isTelegramConfigured()) return { ok: false, blocked: false, message: 'Telegram is not configured' }

  let response: Response
  try {
    response = await fetch(`https://api.telegram.org/bot${config.telegram.botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: html,
        parse_mode: 'HTML',
        link_preview_options: { is_disabled: true },
      }),
      signal: AbortSignal.timeout(TELEGRAM_TIMEOUT_MS),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Telegram request failed'
    console.error(`[telegram] sendMessage did not complete: ${message}`)
    return { ok: false, blocked: false, message }
  }

  const parsed = (await response.json().catch(() => null)) as TelegramResponse | null
  if (response.ok && parsed?.ok) return { ok: true }

  const message = parsed?.description ?? `Telegram responded ${response.status}`
  // 403 is "bot was blocked by the user" / "user is deactivated": nothing will ever arrive.
  const blocked = response.status === 403
  console.error(`[telegram] sendMessage failed: ${response.status} ${message}`)
  return { ok: false, blocked, message }
}

/** The Connect deep link: opening it in Telegram and pressing Start sends `/start <token>`. */
export const telegramLinkUrl = (token: string): string => `https://t.me/${config.telegram.botUsername}?start=${token}`
