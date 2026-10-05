import { channelsFor, type NoticeKind, type Recipient } from './noticeRules.js'
import { config } from '../config.js'
import { isMailConfigured, sendExternalMail } from '../lib/mail.js'
import { type Notice, renderNoticeEmail, renderNoticeTelegram } from '../lib/notice-render.js'
import { prisma } from '../lib/prisma.js'
import { sendTelegramMessage } from '../lib/telegram.js'

/**
 * Sends a notification on the channels `noticeRules.ts` picks for its recipient
 * (docs/NOTIFICATIONS.md). Notifications go by **email and Telegram only**; there is no SMS.
 */

/**
 * A chat that blocked the bot will never receive anything again, so the link is dropped —
 * the Notifications tab then shows Telegram as disconnected instead of silently failing.
 */
const unlinkDeadChat = async (chatId: string): Promise<void> => {
  await prisma.user.updateMany({
    where: { telegramChatId: chatId },
    data: { telegramChatId: null, telegramUsername: null, telegramLinkedAt: null },
  })
}

const sendEmail = async (to: string, notice: Notice, label: string): Promise<boolean> => {
  if (!isMailConfigured()) {
    if (config.nodeEnv === 'production') console.error(`[mail] Mail engine unconfigured; ${label} not sent`)
    else console.log(`[mail] ${label} ${to}: ${notice.subject}${notice.link ? `\n${notice.link.url}` : ''}`)
    return false
  }
  const result = await sendExternalMail({ to, ...renderNoticeEmail(notice) })
  if (!result.ok) console.error(`[mail] ${label} failed: ${result.status} ${result.message}`)
  return result.ok
}

const sendTelegram = async (chatId: string, notice: Notice, label: string): Promise<boolean> => {
  const result = await sendTelegramMessage(chatId, renderNoticeTelegram(notice))
  if (!result.ok && result.blocked) await unlinkDeadChat(chatId)
  if (!result.ok) console.error(`[telegram] ${label} failed: ${result.message}`)
  return result.ok
}

/**
 * Send `notice` on every channel `recipient` wants it on. Best-effort and never throws: the
 * booking it describes is already saved, so a failure costs a notice, never a request.
 *
 * `email: false` when the email for this moment is sent elsewhere — the messages that
 * predate Telegram keep their `booking-mail.ts` senders, and only their Telegram copy goes
 * through here.
 */
export const deliver = async (
  recipient: Recipient,
  kind: NoticeKind,
  notice: Notice,
  label: string,
  options: { email?: boolean } = {}
): Promise<void> => {
  const channels = channelsFor(kind, recipient)
  const sends: Promise<boolean>[] = []
  if (channels.email && options.email !== false && recipient.email) sends.push(sendEmail(recipient.email, notice, label))
  if (channels.telegram && recipient.telegramChatId) sends.push(sendTelegram(recipient.telegramChatId, notice, label))

  const results = await Promise.allSettled(sends)
  for (const result of results) {
    if (result.status === 'rejected') console.error(`[notify] ${label} failed`, result.reason)
  }
}
