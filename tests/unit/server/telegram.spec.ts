import { describe, expect, it } from 'vitest'
import { parseTelegramUpdate, telegramSecretMatches } from '../../../server/src/lib/telegram-updates'
import { mintTelegramLinkToken } from '../../../server/src/lib/token'

const update = (text: string, chat: Record<string, unknown> = { id: 987654321012, type: 'private' }) => ({
  update_id: 1,
  message: { message_id: 1, text, chat, from: { id: 987654321012, username: 'anna_p' } },
})

describe('parseTelegramUpdate', () => {
  it('reads a Connect deep link — /start with the link token', () => {
    const token = mintTelegramLinkToken()
    expect(parseTelegramUpdate(update(`/start ${token}`))).toEqual({
      kind: 'start',
      chatId: '987654321012',
      token,
      username: 'anna_p',
    })
  })

  it('reads /start without a token as a plain hello', () => {
    expect(parseTelegramUpdate(update('/start'))).toMatchObject({ kind: 'start', token: undefined })
  })

  it('drops a payload that cannot be one of our tokens', () => {
    expect(parseTelegramUpdate(update('/start <script>'))).toMatchObject({ kind: 'start', token: undefined })
  })

  it('reads /stop, also when addressed to the bot by name', () => {
    expect(parseTelegramUpdate(update('/stop@BookieBot'))).toEqual({ kind: 'stop', chatId: '987654321012' })
  })

  it('treats any other text as other', () => {
    expect(parseTelegramUpdate(update('hello'))).toEqual({ kind: 'other', chatId: '987654321012' })
  })

  // Only a private chat is linked to an account — never a group the bot was added to.
  it('ignores group chats and updates without a message', () => {
    expect(parseTelegramUpdate(update('/start abc', { id: -100, type: 'group' }))).toBeNull()
    expect(parseTelegramUpdate({ update_id: 2, edited_message: {} })).toBeNull()
    expect(parseTelegramUpdate(null)).toBeNull()
  })
})

describe('mintTelegramLinkToken', () => {
  // Telegram caps a /start payload at 64 characters from [A-Za-z0-9_-].
  it('fits a Telegram /start payload', () => {
    const token = mintTelegramLinkToken()
    expect(token).toMatch(/^[A-Za-z0-9_-]{16,64}$/)
    expect(mintTelegramLinkToken()).not.toBe(token)
  })
})

describe('telegramSecretMatches', () => {
  it('accepts only the configured secret', () => {
    expect(telegramSecretMatches('s3cret', 's3cret')).toBe(true)
    expect(telegramSecretMatches('s3cret-', 's3cret')).toBe(false)
    expect(telegramSecretMatches(undefined, 's3cret')).toBe(false)
  })

  // An unconfigured bot must accept updates from nobody.
  it('matches nothing when no secret is configured', () => {
    expect(telegramSecretMatches('', '')).toBe(false)
  })
})
