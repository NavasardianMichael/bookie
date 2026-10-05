import { Router } from 'express'
import { config, isTelegramConfigured } from '../config.js'
import { fail, ok } from '../lib/api-response.js'
import { prisma } from '../lib/prisma.js'
import { createRateLimiter } from '../lib/rateLimit.js'
import { sendTelegramMessage, telegramLinkUrl } from '../lib/telegram.js'
import { parseTelegramUpdate, telegramSecretMatches } from '../lib/telegram-updates.js'
import { hashUrlToken, mintTelegramLinkToken } from '../lib/token.js'
import { requireAuth } from '../middleware/auth.js'
import { asyncHandler, HttpError } from '../middleware/error.js'

/**
 * Linking an account to Telegram, the second notification channel (docs/NOTIFICATIONS.md).
 *
 * The link is made **in Telegram**, never by typing a chat id: `POST /telegram/link` mints a
 * one-time token and answers `t.me/<bot>?start=<token>`; pressing Start there sends the bot
 * `/start <token>`, and the webhook ties that chat to the token's account. Nobody can attach
 * someone else's chat, because only the chat that pressed Start is ever linked.
 *
 * One chat per `User`, shared by both workspaces. Whether a provider's own notices use it is
 * their plan's call (`telegramNotifications`); a client's always do.
 */
export const telegramRouter = Router()
export const telegramWebhookRouter = Router()

/** A Connect link is opened right away or not at all. */
const LINK_TTL_MS = 15 * 60 * 1000

const linkLimiter = createRateLimiter({ limit: 10, windowMs: 60 * 60 * 1000 })

/** Connected, and as whom — the Notifications tab's whole Telegram state. */
telegramRouter.get(
  '/status',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.session!.userId },
      select: { telegramChatId: true, telegramUsername: true },
    })
    return ok(res, {
      available: isTelegramConfigured(),
      linked: Boolean(user?.telegramChatId),
      username: user?.telegramUsername ?? undefined,
    })
  })
)

/**
 * A fresh Connect link. Minting a new one replaces the last — the one-live-token pattern
 * of the verification and reset links (`schema.prisma`, `User`).
 */
telegramRouter.post(
  '/link',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!isTelegramConfigured()) throw new HttpError(503, 'Telegram is not available', 503)

    const verdict = linkLimiter(`user:${req.session!.userId}`)
    if (!verdict.allowed) {
      res.setHeader('Retry-After', String(verdict.retryAfterSeconds))
      throw new HttpError(429, 'Too many attempts. Please try again later.', 429)
    }

    const token = mintTelegramLinkToken()
    await prisma.user.update({
      where: { id: req.session!.userId },
      data: { telegramLinkTokenHash: hashUrlToken(token), telegramLinkExpiresAt: new Date(Date.now() + LINK_TTL_MS) },
    })
    return ok(res, { url: telegramLinkUrl(token) })
  })
)

telegramRouter.delete(
  '/link',
  requireAuth,
  asyncHandler(async (req, res) => {
    await prisma.user.update({
      where: { id: req.session!.userId },
      data: {
        telegramChatId: null,
        telegramUsername: null,
        telegramLinkedAt: null,
        telegramLinkTokenHash: null,
        telegramLinkExpiresAt: null,
      },
    })
    return ok(res, true)
  })
)

/* --- The bot's webhook ------------------------------------------------------- */

const REPLIES = {
  connected:
    'Connected. Bookie will message you here about your bookings, alongside email. ' +
    'Choose what you hear about under Notifications in your Bookie settings. Send /stop to disconnect.',
  expired: 'This link has expired or was already used. In Bookie, open Notifications and press Connect Telegram again.',
  hello: 'To get booking notifications here, open Notifications in your Bookie settings and press Connect Telegram.',
  stopped: 'Disconnected. Bookie will no longer message you here.',
} as const

/** Ties `chatId` to the account whose Connect token this is. False for a spent or unknown token. */
const linkChat = async (token: string, chatId: string, username: string | undefined): Promise<boolean> => {
  const now = new Date()
  const user = await prisma.user.findUnique({
    where: { telegramLinkTokenHash: hashUrlToken(token) },
    select: { id: true, telegramLinkExpiresAt: true },
  })
  if (!user || !user.telegramLinkExpiresAt || user.telegramLinkExpiresAt <= now) return false

  // A chat belongs to one account: linking it here moves it off any other.
  await prisma.$transaction([
    prisma.user.updateMany({
      where: { telegramChatId: chatId, id: { not: user.id } },
      data: { telegramChatId: null, telegramUsername: null, telegramLinkedAt: null },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: {
        telegramChatId: chatId,
        telegramUsername: username ?? null,
        telegramLinkedAt: now,
        telegramLinkTokenHash: null,
        telegramLinkExpiresAt: null,
      },
    }),
  ])
  return true
}

/**
 * Updates from Telegram. Checked against `setWebhook`'s secret, then answered 200 whatever
 * the content — Telegram re-delivers anything else, and nothing in an update is worth a retry.
 */
telegramWebhookRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    if (!telegramSecretMatches(req.get('X-Telegram-Bot-Api-Secret-Token'), config.telegram.webhookSecret)) {
      return fail(res, 'Invalid secret', 401, 401)
    }

    const command = parseTelegramUpdate(req.body)
    if (!command) return ok(res, true)

    let reply: string
    if (command.kind === 'start') {
      reply = command.token
        ? (await linkChat(command.token, command.chatId, command.username))
          ? REPLIES.connected
          : REPLIES.expired
        : REPLIES.hello
    } else if (command.kind === 'stop') {
      await prisma.user.updateMany({
        where: { telegramChatId: command.chatId },
        data: { telegramChatId: null, telegramUsername: null, telegramLinkedAt: null },
      })
      reply = REPLIES.stopped
    } else {
      reply = REPLIES.hello
    }

    const sent = await sendTelegramMessage(command.chatId, reply)
    if (!sent.ok) console.error(`[telegram] reply failed: ${sent.message}`)
    return ok(res, true)
  })
)
